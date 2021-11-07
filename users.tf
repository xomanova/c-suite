# A resource that does nothing.
resource "aws_cognito_user_pool" "users" {
  name                = "potential-guacamole-users"
  username_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "webauth-client" {
  name                                 = "webauth-client"
  user_pool_id                         = aws_cognito_user_pool.users.id
  generate_secret                      = true
  explicit_auth_flows                  = ["ADMIN_NO_SRP_AUTH"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"]
  callback_urls                        = ["https://www.github.com"]
  supported_identity_providers         = [aws_cognito_identity_provider.users-identity-provider.provider_name]
}

resource "aws_cognito_user_pool_ui_customization" "webauth-client-customization" {
  client_id    = aws_cognito_user_pool_client.webauth-client.id
  css          = ".label-customizable {font-weight: 400;}"
  image_file   = filebase64("potential-guacamole.png")
  user_pool_id = aws_cognito_user_pool.users.id
}

resource "aws_cognito_identity_provider" "users-identity-provider" {
  user_pool_id  = aws_cognito_user_pool.users.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email"
    client_id        = var.google_app_id
    client_secret    = var.google_app_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_identity_pool" "users-identity" {
  identity_pool_name               = "potential-guacamole-users-identity"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  supported_login_providers = {
    "accounts.google.com" = var.google_app_id
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain          = "login.megrehn.com"
  certificate_arn = data.aws_acm_certificate.acm_cert.arn
  user_pool_id    = aws_cognito_user_pool.users.id
}

resource "aws_route53_record" "auth-cognito-A" {
  name    = aws_cognito_user_pool_domain.main.domain
  type    = "A"
  zone_id = data.aws_route53_zone.zone.zone_id

  alias {
    evaluate_target_health = false
    name                   = aws_cognito_user_pool_domain.main.cloudfront_distribution_arn
    # This zone_id is fixed
    zone_id = "Z2FDTNDATAQYW2"
  }
}

# User pool and group roles
resource "aws_cognito_identity_pool_roles_attachment" "identity-role" {
  identity_pool_id = aws_cognito_identity_pool.users-identity.id

  role_mapping {
    identity_provider         = aws_cognito_identity_provider.users-identity-provider.id
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Token"
  }

  roles = {
    "authenticated" = aws_iam_role.users-ddb-iam-role.arn
  }
}

resource "aws_cognito_user_group" "webusers" {
  name         = "webusers"
  user_pool_id = aws_cognito_user_pool.users.id
  description  = "Managed by Terraform"
  precedence   = 42
  role_arn     = aws_iam_role.users-ddb-iam-role.arn
}