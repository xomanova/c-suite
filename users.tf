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
  name                = "webauth-client"
  user_pool_id        = aws_cognito_user_pool.users.id
  generate_secret     = true
  explicit_auth_flows = ["ADMIN_NO_SRP_AUTH"]
}

resource "aws_cognito_identity_pool" "users-identity" {
  identity_pool_name               = "potential-guacamole-users-identity"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id = aws_cognito_user_pool_client.webauth-client.id
    #provider_name           = aws_cognito_user_pool_client.webauth-client.name
    server_side_token_check = false
  }
}