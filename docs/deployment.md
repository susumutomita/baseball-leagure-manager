# デプロイガイド

このガイドでは、草野球リーグマネージャーをクラウド環境にデプロイする方法について説明します。

## 目次

1. [前提条件](#前提条件)
2. [AWS へのデプロイ](#aws-へのデプロイ)
3. [Google Cloud へのデプロイ](#google-cloud-へのデプロイ)
4. [Azure へのデプロイ](#azure-へのデプロイ)
5. [Kubernetes クラスタへの直接デプロイ](#kubernetes-クラスタへの直接デプロイ)
6. [CI/CD パイプラインの設定](#cicd-パイプラインの設定)
7. [本番環境の設定](#本番環境の設定)
8. [トラブルシューティング](#トラブルシューティング)

## 前提条件

デプロイを開始する前に、以下のツールがインストールされていることを確認してください：

- Docker
- Terraform (v1.0.0以上)
- AWS CLI, Google Cloud SDK, または Azure CLI (デプロイ先に応じて)
- kubectl
- Task

また、以下の情報が必要です：

- クラウドプロバイダーのアクセスキーと認証情報
- データベースのユーザー名とパスワード
- KeyCloakの設定情報
- Stripeの API キー

## AWS へのデプロイ

AWS へのデプロイは Terraform を使用して行います：

1. 環境変数の設定：

```bash
# 以下の環境変数を実際の値に置き換えてください
export AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY_ID>
export AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_ACCESS_KEY>
export TF_VAR_db_username=<YOUR_DB_USERNAME>
export TF_VAR_db_password=<YOUR_DB_PASSWORD>
```

2. Taskfile を使用したデプロイ：

```bash
task deploy:aws
```

これにより、以下のリソースが作成されます：

- VPC とサブネット
- EKS クラスタ
- RDS PostgreSQL データベース
- ElastiCache Redis クラスタ
- ECR リポジトリ

3. Kubernetes マニフェストの適用：

```bash
# kubeconfig の取得
aws eks update-kubeconfig --name baseball-league-eks --region <YOUR_REGION>

# ECR リポジトリ URI の取得
export ECR_REPOSITORY_URI=$(aws ecr describe-repositories --repository-names baseball-league-manager --query 'repositories[0].repositoryUri' --output text)

# テンプレートファイルからマニフェストを生成
cp kubernetes/deployment.yaml.template kubernetes/deployment.yaml
cp kubernetes/config.yaml.template kubernetes/config.yaml

# 環境変数を設定
export DOMAIN_NAME=<YOUR_DOMAIN_NAME>
export REPOSITORY_URI=$ECR_REPOSITORY_URI
export DATABASE_URL=<YOUR_DATABASE_URL>
export REDIS_URL=<YOUR_REDIS_URL>
export RAILS_MASTER_KEY=<YOUR_RAILS_MASTER_KEY>
export KEYCLOAK_URL=<YOUR_KEYCLOAK_URL>
export KEYCLOAK_REALM=<YOUR_KEYCLOAK_REALM>
export KEYCLOAK_CLIENT_ID=<YOUR_KEYCLOAK_CLIENT_ID>
export KEYCLOAK_CLIENT_SECRET=<YOUR_KEYCLOAK_CLIENT_SECRET>
export STRIPE_API_KEY=<YOUR_STRIPE_API_KEY>

# 環境変数を置換してマニフェストを適用
envsubst < kubernetes/deployment.yaml | kubectl apply -f -
envsubst < kubernetes/config.yaml | kubectl apply -f -

# 生成したマニフェストファイルを削除（セキュリティのため）
rm kubernetes/deployment.yaml kubernetes/config.yaml
```

**注意**: セキュリティ上の理由から、実際のシークレットを含むマニフェストファイルはリポジトリにコミットしないでください。テンプレートファイルのみをコミットし、デプロイ時に環境変数を使用して実際の値を設定してください。

## Google Cloud へのデプロイ

Google Cloud へのデプロイも同様に Terraform を使用します：

1. 認証の設定：

```bash
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>
export GOOGLE_APPLICATION_CREDENTIALS=<PATH_TO_YOUR_CREDENTIALS_JSON>
```

2. Taskfile を使用したデプロイ：

```bash
task deploy:gcp
```

3. Kubernetes マニフェストの適用：

```bash
gcloud container clusters get-credentials baseball-league-gke --zone <YOUR_ZONE>
export GCR_REPOSITORY_URI=gcr.io/<YOUR_PROJECT_ID>/baseball-league-manager
export REPOSITORY_URI=$GCR_REPOSITORY_URI
export DOMAIN_NAME=<YOUR_DOMAIN_NAME>
export DATABASE_URL=<YOUR_DATABASE_URL>
export REDIS_URL=<YOUR_REDIS_URL>
export RAILS_MASTER_KEY=<YOUR_RAILS_MASTER_KEY>
export KEYCLOAK_URL=<YOUR_KEYCLOAK_URL>
export KEYCLOAK_REALM=<YOUR_KEYCLOAK_REALM>
export KEYCLOAK_CLIENT_ID=<YOUR_KEYCLOAK_CLIENT_ID>
export KEYCLOAK_CLIENT_SECRET=<YOUR_KEYCLOAK_CLIENT_SECRET>
export STRIPE_API_KEY=<YOUR_STRIPE_API_KEY>

envsubst < kubernetes/deployment.yaml | kubectl apply -f -
envsubst < kubernetes/config.yaml | kubectl apply -f -
```

## Azure へのデプロイ

Azure へのデプロイも Terraform を使用します：

1. 認証の設定：

```bash
az login
export ARM_SUBSCRIPTION_ID=<YOUR_SUBSCRIPTION_ID>
export ARM_TENANT_ID=<YOUR_TENANT_ID>
export ARM_CLIENT_ID=<YOUR_CLIENT_ID>
export ARM_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
```

2. Taskfile を使用したデプロイ：

```bash
task deploy:azure
```

3. Kubernetes マニフェストの適用：

```bash
az aks get-credentials --resource-group baseball-league-rg --name baseball-league-aks
export ACR_REPOSITORY_URI=<YOUR_ACR_NAME>.azurecr.io/baseball-league-manager
export REPOSITORY_URI=$ACR_REPOSITORY_URI
export DOMAIN_NAME=<YOUR_DOMAIN_NAME>
export DATABASE_URL=<YOUR_DATABASE_URL>
export REDIS_URL=<YOUR_REDIS_URL>
export RAILS_MASTER_KEY=<YOUR_RAILS_MASTER_KEY>
export KEYCLOAK_URL=<YOUR_KEYCLOAK_URL>
export KEYCLOAK_REALM=<YOUR_KEYCLOAK_REALM>
export KEYCLOAK_CLIENT_ID=<YOUR_KEYCLOAK_CLIENT_ID>
export KEYCLOAK_CLIENT_SECRET=<YOUR_KEYCLOAK_CLIENT_SECRET>
export STRIPE_API_KEY=<YOUR_STRIPE_API_KEY>

envsubst < kubernetes/deployment.yaml | kubectl apply -f -
envsubst < kubernetes/config.yaml | kubectl apply -f -
```

## Kubernetes クラスタへの直接デプロイ

既存の Kubernetes クラスタにデプロイする場合：

1. kubeconfig の設定：

```bash
export KUBECONFIG=path/to/your/kubeconfig
```

2. シークレットとコンフィグマップの作成：

```bash
kubectl create namespace baseball-league

# ConfigMap の作成
kubectl create configmap baseball-league-config \
  --namespace baseball-league \
  --from-literal=keycloak-url=${KEYCLOAK_URL} \
  --from-literal=keycloak-realm=${KEYCLOAK_REALM} \
  --from-literal=keycloak-client-id=${KEYCLOAK_CLIENT_ID}

# Secret の作成
kubectl create secret generic baseball-league-secrets \
  --namespace baseball-league \
  --from-literal=database-url=${DATABASE_URL} \
  --from-literal=redis-url=${REDIS_URL} \
  --from-literal=rails-master-key=${RAILS_MASTER_KEY} \
  --from-literal=keycloak-client-secret=${KEYCLOAK_CLIENT_SECRET} \
  --from-literal=stripe-api-key=${STRIPE_API_KEY}
```

3. デプロイメントの作成：

```bash
export REPOSITORY_URI=your-registry/baseball-league-manager
envsubst < kubernetes/deployment.yaml | kubectl apply -f -n baseball-league -
```

## CI/CD パイプラインの設定

GitHub Actions を使用した CI/CD パイプラインの設定例：

1. `.github/workflows/ci.yml` ファイルを作成
2. 以下の環境変数をリポジトリのシークレットとして設定：
   - `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY`（または他のクラウドプロバイダーの認証情報）
   - `DOCKER_USERNAME` と `DOCKER_PASSWORD`
   - `RAILS_MASTER_KEY`

## 本番環境の設定

本番環境では以下の設定を行ってください：

1. SSL/TLS 証明書の設定
2. バックアップの設定
3. モニタリングとアラートの設定
4. スケーリングポリシーの設定

## トラブルシューティング

デプロイ中に問題が発生した場合は、以下を確認してください：

1. Terraform のログ：
   ```bash
   export TF_LOG=DEBUG
   ```

2. Kubernetes のポッドのステータス：
   ```bash
   kubectl get pods -n baseball-league
   kubectl describe pod <pod-name> -n baseball-league
   kubectl logs <pod-name> -n baseball-league
   ```

3. アプリケーションのログ：
   ```bash
   kubectl logs -f deployment/baseball-league-web -n baseball-league
   ```
