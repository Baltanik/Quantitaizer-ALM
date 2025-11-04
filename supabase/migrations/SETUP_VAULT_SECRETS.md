# 🔐 SETUP VAULT SECRETS - IMPORTANTE

Dopo aver applicato la migration `20251104_enable_automatic_refresh.sql`, devi configurare i secrets in Supabase Vault.

## 📋 STEP 1: Ottenere le credenziali

### Per PRODUZIONE:
1. Vai su [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **API**
4. Copia:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **service_role key**: `eyJhbGc...` (⚠️ NON usare anon key!)

### Per SVILUPPO LOCALE:
- **Project URL**: `http://127.0.0.1:54321`
- **service_role key**: Dalla tua `.env.local` o output di `supabase status`

---

## 📋 STEP 2: Salvare secrets in Vault

### OPZIONE A: Via SQL Editor (Dashboard)

1. Apri [SQL Editor](https://app.supabase.com/project/_/sql/new)
2. Esegui questo SQL (sostituisci con i tuoi valori):

```sql
-- Per PRODUZIONE (sostituisci con i tuoi valori reali)
SELECT vault.create_secret('https://your-project-ref.supabase.co', 'project_url');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 'service_key');

-- Verifica che siano stati creati
SELECT name FROM vault.decrypted_secrets;
```

### OPZIONE B: Via Supabase CLI (Locale)

```bash
# Connettiti al DB locale
supabase db reset  # Applica tutte le migrations

# Esegui lo script di setup secrets
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
SELECT vault.create_secret('http://127.0.0.1:54321', 'project_url');
SELECT vault.create_secret('YOUR_LOCAL_SERVICE_KEY', 'service_key');
SELECT name FROM vault.decrypted_secrets;
EOF
```

---

## 📋 STEP 3: Verificare configurazione

Esegui questo SQL per verificare che tutto sia configurato correttamente:

```sql
-- 1. Verifica secrets esistono
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN '✅ Configurato'
    ELSE '❌ Mancante'
  END as status,
  LENGTH(decrypted_secret) as secret_length
FROM vault.decrypted_secrets 
WHERE name IN ('project_url', 'service_key');

-- 2. Verifica cron job attivo
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Attivo'
    ELSE '❌ Disattivato'
  END as status
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';

-- 3. Test manuale del job (NON eseguire se vuoi evitare rate limit)
-- SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');
```

---

## 📋 STEP 4: Monitorare esecuzioni

```sql
-- Visualizza log delle ultime esecuzioni cron
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh'
)
ORDER BY start_time DESC 
LIMIT 10;

-- Visualizza log refresh custom
SELECT * FROM public.fed_data_refresh_log 
ORDER BY triggered_at DESC 
LIMIT 10;

-- Info ultimo refresh per UI
SELECT * FROM public.get_last_refresh_info();
```

---

## ⚠️ TROUBLESHOOTING

### Problema: "function vault.create_secret does not exist"
**Soluzione**: Vault extension non abilitato
```sql
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;
```

### Problema: "cron job non si esegue"
**Soluzione**: Verifica che pg_cron sia abilitato e che i secrets siano corretti
```sql
-- Riavvia il worker pg_cron
SELECT cron.unschedule('quantitaizer-fed-data-refresh');
-- Poi ri-esegui la migration
```

### Problema: "Edge function timeout"
**Soluzione**: Aumenta il timeout nella migration (già a 120s, potrebbe servire più tempo)

---

## 🔄 DISABILITARE CRON (se necessario)

```sql
-- Disabilita temporaneamente
SELECT cron.unschedule('quantitaizer-fed-data-refresh');

-- Ri-abilita
-- (ri-esegui la migration o usa cron.schedule manualmente)
```

---

## 📊 SCHEDULE CONFIGURATO

| Orario UTC | Orario CET/CEST | Giorni |
|------------|-----------------|--------|
| 08:00      | 09:00/10:00     | Lun-Ven |
| 12:00      | 13:00/14:00     | Lun-Ven |
| 16:00      | 17:00/18:00     | Lun-Ven |
| 20:00      | 21:00/22:00     | Lun-Ven |

**Totale**: 4 refresh/giorno nei giorni lavorativi = 20 chiamate/settimana

**Rate limit safety**: 20/settimana vs ~840/settimana limite (120/ora * 24h * 7gg) = **97% di margine** ✅

---

## ✅ CHECKLIST FINALE

- [ ] Migration applicata (`20251104_enable_automatic_refresh.sql`)
- [ ] Secrets configurati in Vault (project_url + service_key)
- [ ] Cron job attivo (verificato con query)
- [ ] Test manuale funzionante (opzionale)
- [ ] Monitoring attivo (check logs dopo 4 ore)

**Dopo il setup, il sistema si aggiornerà automaticamente ogni 4 ore nei giorni lavorativi! 🚀**

