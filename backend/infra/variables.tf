variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "node-app-cluster"
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.34"
}

variable "node_instance_type" {
  description = "EC2 instance type for EKS nodes"
  type        = string
  default     = "t3.small"
}

variable "node_desired_count" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_count" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 4
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "node_db"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "node_user"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "domain_name" {
  description = "Root domain name (must exist in Route 53)"
  type        = string
  default     = "gdgrbu.dev"
}

variable "api_subdomain" {
  description = "Subdomain for the backend API"
  type        = string
  default     = "node"
}

variable "dashboard_subdomain" {
  description = "Subdomain for Grafana dashboard"
  type        = string
  default     = "dashboard"
}
