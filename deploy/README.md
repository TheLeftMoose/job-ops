# JobOps Azure deployment (Terraform)

Provisions JobOps on **Azure Container Apps** in Sweden Central.

## Branch model

This directory lives on the long-lived **`infra` branch only** of the fork
(`TheLeftMoose/job-ops`). It is intentionally absent from `main` so that PRs
from `main` to the upstream project (`DaKheera47/job-ops`) stay free of
deployment-specific files (operator IPs, tfvars, infra state config, etc.).

Working rules:

| Task                                     | Branch off       | Push to                | PR target              |
|------------------------------------------|------------------|------------------------|------------------------|
| Bug fix / feature for upstream           | `upstream/main`  | `origin/feat/<topic>`  | `DaKheera47:main`      |
| Your own infra/deploy change             | `origin/infra`   | `origin/infra-<topic>` | `origin/infra`         |
| Pull in upstream updates                 | —                | merge `upstream/main` → `origin/main`, then merge `origin/main` → `origin/infra` | — |

Never PR `infra` (or anything containing `deploy/`) to upstream.

## Layout

```markdown
deploy/
├─ bootstrap/        One-off: creates RG + Storage Account for tfstate (local state)
├─ providers.tf      AzureRM + azapi + random; azurerm remote backend
├─ variables.tf
├─ main.tf           Composes the four modules
├─ outputs.tf
└─ modules/
   ├─ foundation/    Log Analytics, User-assigned MI, Key Vault (RBAC)
   ├─ storage/       Storage Account + Azure Files shares (data, codex-home)
   ├─ aca-env/       Container Apps Environment + env storage bindings
   └─ aca-app/       Container App (image, ingress, secrets, volume mounts, probes)
```

## Prereqs

- `az login` with access to subscription `d85485c6-e97c-4b2b-9e1a-4176837bd625`
- Terraform >= 1.6
- Resource providers registered (the deployer does this once, see `Deploy` step 1)

## Deploy

```pwsh
# 0. Set the right sub
az account set --subscription d85485c6-e97c-4b2b-9e1a-4176837bd625

# 1. Register resource providers (idempotent)
foreach ($p in 'Microsoft.App','Microsoft.OperationalInsights','Microsoft.KeyVault','Microsoft.Storage') {
  az provider register -n $p --consent-to-permissions | Out-Null
}

# 2. Bootstrap the tfstate storage account (local state, run once per sub)
cd deploy/bootstrap
terraform init
terraform apply -auto-approve
$SA = terraform output -raw storage_account_name
$RG = terraform output -raw resource_group_name
$CT = terraform output -raw container_name
cd ..

# 3. Init main TF against the remote backend
terraform init `
  -backend-config="resource_group_name=$RG" `
  -backend-config="storage_account_name=$SA" `
  -backend-config="container_name=$CT" `
  -backend-config="key=jobops-prod.tfstate"

# 4. First apply WITHOUT the Container App secrets/app (foundation only),
#    so Key Vault exists before we try to reference secrets.
terraform apply -target=module.foundation -target=module.storage -auto-approve

# 5. Seed Key Vault secrets
$KV = terraform output -raw key_vault_name
$pw = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$jwt = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
az keyvault secret set --vault-name $KV --name basic-auth-user --value "admin" | Out-Null
az keyvault secret set --vault-name $KV --name basic-auth-password --value $pw | Out-Null
az keyvault secret set --vault-name $KV --name jwt-secret --value $jwt | Out-Null
Write-Host "BASIC_AUTH_USER=admin"
Write-Host "BASIC_AUTH_PASSWORD=$pw"

# 6. Apply everything (now creates the Container App)
terraform apply -auto-approve

# 7. Smoke test
$fqdn = terraform output -raw container_app_fqdn
curl.exe -i "https://$fqdn/health"
```

## Notes

- Single replica (SQLite). Deploys briefly take the app offline.
- Volumes: `/app/data` and `/app/codex-home` are Azure Files SMB shares.
- Secrets are stored in Key Vault and surfaced into the app via the
  user-assigned managed identity using `secret { key_vault_secret_id = ... }`.
- LLM provider env vars are intentionally **not** wired yet. When you decide on
  one, add the secret to Key Vault and a corresponding `secret { ... }` +
  `env { secret_name = ... }` pair in `modules/aca-app/main.tf`.

## Tear down

```pwsh
terraform destroy -auto-approve   # removes everything except tfstate SA
cd bootstrap; terraform destroy -auto-approve
```
