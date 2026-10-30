# Production Kubernetes Deployment & Cloud IAM Configuration

## 1. Secrets Management via External Secrets Operator (ESO)
In production, credentials are never committed or manually managed as static secrets.
The system uses the Kubernetes `ExternalSecrets` operator to pull secrets directly from AWS Secrets Manager, HashiCorp Vault, or Google Cloud Secret Manager into the `gate-monitor-secrets` resource.

### EKS IAM ServiceAccount Configuration
1. Create an IAM policy with read access to the secret prefix:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "secretsmanager:GetSecretValue",
           "secretsmanager:DescribeSecret"
         ],
         "Resource": "arn:aws:secretsmanager:ap-south-1:*:secret:gate-monitor/prod/*"
       }
     ]
   }
   ```
2. Associate the IAM role with the `gate-secrets-sa` ServiceAccount using IRSA (IAM Roles for Service Accounts):
   ```bash
   eksctl create iamserviceaccount \
     --name gate-secrets-sa \
     --namespace gate-monitor \
     --cluster <CLUSTER_NAME> \
     --role-name gate-monitor-secrets-role \
     --attach-policy-arn <POLICY_ARN> \
     --approve
   ```
3. Apply the external secrets manifests:
   ```bash
   kubectl apply -f k8s/external-secrets.yaml
   ```

---

## 2. Shared Multi-Instance Upload Storage (S3 / MinIO)
For multi-replica deployments, files (complaint attachments and permission PDF outpasses) are written to and served from S3-compatible shared storage.

### Environment Configuration in `gate-monitor-secrets`:
- `S3_ENDPOINT`: e.g. `https://s3.ap-south-1.amazonaws.com` (or `http://minio:9000` for on-prem MinIO)
- `S3_BUCKET`: `gate-monitor-uploads-prod`
- `AWS_REGION`: `ap-south-1`
- `AWS_ACCESS_KEY_ID`: Configured via IAM or ESO
- `AWS_SECRET_ACCESS_KEY`: Configured via IAM or ESO

---

## 3. Deployment Checklist
1. Apply Namespace and ConfigMap:
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```
2. Verify Secrets synchronization:
   ```bash
   kubectl get externalsecret gate-monitor-secrets -n gate-monitor
   ```
3. Monitor rolling deployment:
   ```bash
   kubectl rollout status deployment/gate-web -n gate-monitor
   ```
