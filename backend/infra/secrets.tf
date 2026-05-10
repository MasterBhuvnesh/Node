resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.cluster_name}/jwt-secret"
  description = "JWT signing key for backend auth"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    JWT_SECRET         = "CHANGE_ME_TO_A_RANDOM_STRING"
    JWT_REFRESH_SECRET = "CHANGE_ME_TO_A_DIFFERENT_RANDOM_STRING"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "smtp" {
  name        = "${var.cluster_name}/smtp"
  description = "SMTP credentials for email service"
}

resource "aws_secretsmanager_secret_version" "smtp" {
  secret_id     = aws_secretsmanager_secret.smtp.id
  secret_string = jsonencode({
    SMTP_HOST     = "smtp.gmail.com"
    SMTP_USER     = "your-email@gmail.com"
    SMTP_PASSWORD = "your-app-password"
    EMAIL_FROM    = "Notification Service <your-email@gmail.com>"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
