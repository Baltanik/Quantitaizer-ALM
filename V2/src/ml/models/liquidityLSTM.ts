import * as tf from '@tensorflow/tfjs';
import { TrainingData } from '../utils/dataPreparation';

export interface ModelConfig {
  sequenceLength: number;
  featuresCount: number;
  targetsCount: number;
  lstmUnits: number[];
  denseUnits: number[];
  dropout: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

export interface TrainingMetrics {
  loss: number[];
  valLoss: number[];
  mae: number[];
  valMae: number[];
  accuracy?: number[];
  valAccuracy?: number[];
}

export interface PredictionResult {
  liquidityScore: number;
  scenarioChangeProb: number;
  directionProb: number;
  magnitudeChange: number;
  confidence: number;
  timestamp: string;
}

/**
 * LSTM Model per Fed Liquidity Forecasting
 * Implementa architettura multi-layer LSTM con dropout per prevenire overfitting
 */
export class LiquidityLSTMModel {
  private model: tf.Sequential | null = null;
  private config: ModelConfig;
  private isCompiled = false;
  private trainingHistory: TrainingMetrics | null = null;

  constructor(config: Partial<ModelConfig> = {}) {
    // Default configuration ottimizzata per Fed data
    this.config = {
      sequenceLength: 30, // 30 giorni di lookback
      featuresCount: 16, // Features dal data preparation
      targetsCount: 4, // 4 target predictions
      lstmUnits: [64, 32], // Multi-layer LSTM
      denseUnits: [16], // Dense layers
      dropout: 0.2,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      ...config
    };

    console.log('[LSTM] Model initialized with config:', this.config);
  }

  /**
   * Costruisce l'architettura del modello LSTM
   */
  buildModel(): tf.Sequential {
    console.log('[LSTM] Building model architecture...');

    this.model = tf.sequential();

    // Input layer
    this.model.add(tf.layers.inputLayer({
      inputShape: [this.config.sequenceLength, this.config.featuresCount]
    }));

    // LSTM layers
    for (let i = 0; i < this.config.lstmUnits.length; i++) {
      const isLastLSTM = i === this.config.lstmUnits.length - 1;
      
      this.model.add(tf.layers.lstm({
        units: this.config.lstmUnits[i],
        returnSequences: !isLastLSTM, // Only last LSTM returns sequences
        dropout: this.config.dropout,
        recurrentDropout: this.config.dropout,
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }), // L2 regularization
        name: `lstm_${i + 1}`
      }));

      // Batch normalization per stabilità
      this.model.add(tf.layers.batchNormalization({
        name: `batch_norm_lstm_${i + 1}`
      }));
    }

    // Dense layers
    for (let i = 0; i < this.config.denseUnits.length; i++) {
      this.model.add(tf.layers.dense({
        units: this.config.denseUnits[i],
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
        name: `dense_${i + 1}`
      }));

      this.model.add(tf.layers.dropout({
        rate: this.config.dropout * 1.5, // Più dropout nei dense layers
        name: `dropout_${i + 1}`
      }));
    }

    // Output layer - Multi-task learning
    this.model.add(tf.layers.dense({
      units: this.config.targetsCount,
      activation: 'sigmoid', // Sigmoid per output 0-1
      name: 'output'
    }));

    console.log('[LSTM] Model architecture built successfully');
    this.model.summary();

    return this.model;
  }

  /**
   * Compila il modello con loss function e optimizer appropriati
   */
  compileModel(): void {
    if (!this.model) {
      throw new Error('Model must be built before compilation');
    }

    console.log('[LSTM] Compiling model...');

    // Custom loss function per multi-task learning
    const customLoss = (yTrue: tf.Tensor, yPred: tf.Tensor) => {
      return tf.tidy(() => {
        // Weighted MSE per diversi target
        const weights = tf.tensor1d([1.0, 2.0, 1.5, 1.0]); // Peso maggiore per scenario change
        const mse = tf.losses.meanSquaredError(yTrue, yPred);
        
        // Apply weights
        const weightedMse = tf.mul(mse, weights);
        return tf.mean(weightedMse);
      });
    };

    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: customLoss,
      metrics: ['mae', 'mse']
    });

    this.isCompiled = true;
    console.log('[LSTM] Model compiled successfully');
  }

  /**
   * Prepara i dati per il training in formato sequence
   */
  private prepareSequenceData(data: TrainingData): {
    trainX: tf.Tensor3D;
    trainY: tf.Tensor2D;
    valX: tf.Tensor3D;
    valY: tf.Tensor2D;
  } {
    console.log('[LSTM] Preparing sequence data...');

    const createSequences = (features: number[][], targets: number[][]) => {
      const sequences: number[][][] = [];
      const sequenceTargets: number[][] = [];

      for (let i = this.config.sequenceLength; i < features.length; i++) {
        // Create sequence of length sequenceLength
        const sequence = features.slice(i - this.config.sequenceLength, i);
        sequences.push(sequence);
        sequenceTargets.push(targets[i]);
      }

      return { sequences, targets: sequenceTargets };
    };

    // Create training sequences
    const trainSeq = createSequences(data.trainFeatures, data.trainTargets);
    const valSeq = createSequences(data.valFeatures, data.valTargets);

    console.log(`[LSTM] Created ${trainSeq.sequences.length} training sequences`);
    console.log(`[LSTM] Created ${valSeq.sequences.length} validation sequences`);

    // Convert to tensors
    const trainX = tf.tensor3d(trainSeq.sequences);
    const trainY = tf.tensor2d(trainSeq.targets);
    const valX = tf.tensor3d(valSeq.sequences);
    const valY = tf.tensor2d(valSeq.targets);

    return { trainX, trainY, valX, valY };
  }

  /**
   * Addestra il modello sui dati storici
   */
  async train(data: TrainingData): Promise<TrainingMetrics> {
    if (!this.model || !this.isCompiled) {
      throw new Error('Model must be built and compiled before training');
    }

    console.log('[LSTM] Starting training...');

    // Prepare sequence data
    const { trainX, trainY, valX, valY } = this.prepareSequenceData(data);

    // Training callbacks
    const callbacks: tf.CustomCallback[] = [
      {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`[LSTM] Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}`);
          }
        }
      }
    ];

    // Early stopping callback
    let bestValLoss = Infinity;
    let patienceCounter = 0;
    const patience = 15;

    callbacks.push({
      onEpochEnd: (epoch, logs) => {
        const valLoss = logs?.val_loss || Infinity;
        if (valLoss < bestValLoss) {
          bestValLoss = valLoss;
          patienceCounter = 0;
        } else {
          patienceCounter++;
          if (patienceCounter >= patience) {
            console.log(`[LSTM] Early stopping at epoch ${epoch}`);
            this.model?.stopTraining = true;
          }
        }
      }
    });

    // Train the model
    const history = await this.model.fit(trainX, trainY, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationData: [valX, valY],
      callbacks,
      shuffle: true,
      verbose: 0
    });

    // Store training history
    this.trainingHistory = {
      loss: history.history.loss as number[],
      valLoss: history.history.val_loss as number[],
      mae: history.history.mae as number[],
      valMae: history.history.val_mae as number[]
    };

    // Cleanup tensors
    trainX.dispose();
    trainY.dispose();
    valX.dispose();
    valY.dispose();

    console.log('[LSTM] Training completed');
    return this.trainingHistory;
  }

  /**
   * Genera predizioni per nuovi dati
   */
  async predict(sequenceData: number[][]): Promise<PredictionResult> {
    if (!this.model) {
      throw new Error('Model must be trained before making predictions');
    }

    // Ensure sequence has correct length
    if (sequenceData.length !== this.config.sequenceLength) {
      throw new Error(`Sequence length must be ${this.config.sequenceLength}`);
    }

    // Convert to tensor
    const inputTensor = tf.tensor3d([sequenceData]);

    // Make prediction
    const prediction = this.model.predict(inputTensor) as tf.Tensor2D;
    const predictionData = await prediction.data();

    // Cleanup
    inputTensor.dispose();
    prediction.dispose();

    // Parse prediction results
    const [liquidityScore, scenarioChangeProb, directionProb, magnitudeChange] = predictionData;

    // Calculate confidence based on model certainty
    const confidence = this.calculateConfidence([liquidityScore, scenarioChangeProb, directionProb, magnitudeChange]);

    return {
      liquidityScore: Math.round(liquidityScore * 100), // Convert back to 0-100 scale
      scenarioChangeProb: Math.round(scenarioChangeProb * 100),
      directionProb: Math.round(directionProb * 100),
      magnitudeChange: magnitudeChange,
      confidence: Math.round(confidence * 100),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calcola confidence score basato sulla certezza delle predizioni
   */
  private calculateConfidence(predictions: number[]): number {
    // Confidence basato su quanto le predizioni sono vicine a 0 o 1 (decisioni chiare)
    const certainties = predictions.map(pred => {
      // Distance from 0.5 (neutral) normalized to 0-1
      return Math.abs(pred - 0.5) * 2;
    });

    // Average certainty
    return certainties.reduce((sum, cert) => sum + cert, 0) / certainties.length;
  }

  /**
   * Valuta le performance del modello su test set
   */
  async evaluate(testData: TrainingData): Promise<{
    loss: number;
    mae: number;
    accuracy: number;
  }> {
    if (!this.model) {
      throw new Error('Model must be trained before evaluation');
    }

    const { valX, valY } = this.prepareSequenceData(testData);

    const evaluation = await this.model.evaluate(valX, valY) as tf.Scalar[];
    const [loss, mae] = await Promise.all(evaluation.map(tensor => tensor.data()));

    // Calculate accuracy for binary predictions (scenario change, direction)
    const predictions = this.model.predict(valX) as tf.Tensor2D;
    const predData = await predictions.data();
    const targetData = await valY.data();

    let correctPredictions = 0;
    const totalPredictions = valY.shape[0];

    for (let i = 0; i < totalPredictions; i++) {
      const predScenarioChange = predData[i * 4 + 1] > 0.5 ? 1 : 0;
      const actualScenarioChange = targetData[i * 4 + 1] > 0.5 ? 1 : 0;
      
      if (predScenarioChange === actualScenarioChange) {
        correctPredictions++;
      }
    }

    const accuracy = correctPredictions / totalPredictions;

    // Cleanup
    valX.dispose();
    valY.dispose();
    predictions.dispose();
    evaluation.forEach(tensor => tensor.dispose());

    return {
      loss: loss[0],
      mae: mae[0],
      accuracy
    };
  }

  /**
   * Salva il modello per uso futuro
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`file://${path}`);
    console.log(`[LSTM] Model saved to ${path}`);
  }

  /**
   * Carica un modello pre-addestrato
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`) as tf.Sequential;
    this.isCompiled = true;
    console.log(`[LSTM] Model loaded from ${path}`);
  }

  /**
   * Ottiene le metriche di training
   */
  getTrainingHistory(): TrainingMetrics | null {
    return this.trainingHistory;
  }

  /**
   * Ottiene la configurazione del modello
   */
  getConfig(): ModelConfig {
    return { ...this.config };
  }

  /**
   * Libera la memoria del modello
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      console.log('[LSTM] Model disposed');
    }
  }
}

/**
 * Factory per creare modelli pre-configurati
 */
export class ModelFactory {
  /**
   * Crea modello ottimizzato per Fed liquidity prediction
   */
  static createLiquidityModel(): LiquidityLSTMModel {
    return new LiquidityLSTMModel({
      sequenceLength: 30,
      lstmUnits: [64, 32],
      denseUnits: [16],
      dropout: 0.2,
      learningRate: 0.001,
      epochs: 100
    });
  }

  /**
   * Crea modello leggero per inference rapida
   */
  static createLightweightModel(): LiquidityLSTMModel {
    return new LiquidityLSTMModel({
      sequenceLength: 14,
      lstmUnits: [32],
      denseUnits: [8],
      dropout: 0.1,
      learningRate: 0.002,
      epochs: 50
    });
  }

  /**
   * Crea modello complesso per massima accuracy
   */
  static createAdvancedModel(): LiquidityLSTMModel {
    return new LiquidityLSTMModel({
      sequenceLength: 60,
      lstmUnits: [128, 64, 32],
      denseUnits: [32, 16],
      dropout: 0.3,
      learningRate: 0.0005,
      epochs: 200
    });
  }
}



