output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "node_role_arn" {
  description = "IAM role ARN for EKS nodes"
  value       = aws_iam_role.eks_nodes.arn
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "database_url" {
  description = "Full DATABASE_URL for the backend"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
  sensitive   = true
}

output "api_certificate_arn" {
  description = "ACM certificate ARN for the API subdomain"
  value       = aws_acm_certificate.api.arn
}

output "dashboard_certificate_arn" {
  description = "ACM certificate ARN for the dashboard subdomain"
  value       = aws_acm_certificate.dashboard.arn
}

output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.region}"
}
