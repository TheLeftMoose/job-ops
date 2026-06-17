# Foundry project stack

Creates a Foundry **project** under an existing AI Services / Foundry account
in subscription `10c5c242-…` (RG `foundary-job-ops`, account
`dennissch-jobops-resource`), plus a `gpt-5.4-mini` chat deployment named
`chat-mini` to be consumed by JobOps.

The deployer needs Contributor on the account's resource group in that sub.

## Deploy

```pwsh
az account set --subscription 10c5c242-6a46-41a1-a93d-ceb66f4212a1
cd deploy/foundry

terraform init `
  -backend-config="resource_group_name=rg-jobops-tfstate" `
  -backend-config="storage_account_name=stjobopstfstkm3uaz" `
  -backend-config="container_name=tfstate" `
  -backend-config="key=jobops-foundry.tfstate" `
  -backend-config="use_azuread_auth=true"

terraform apply -auto-approve
```

State lives in the same Storage Account as the main JobOps stack but under a
distinct blob key (`jobops-foundry.tfstate`) so the two stacks are independent.

## Wiring into JobOps

After apply, set these on the JobOps stack (`deploy/`):

```pwsh
terraform output -raw llm_base_url   # e.g. https://dennissch-jobops-resource.services.ai.azure.com/openai/v1
terraform output -raw llm_model      # chat-mini
```

…then in the JobOps stack pass them as TF vars (`llm_base_url`, `llm_model`)
or update the defaults in `modules/aca-app/main.tf`.
