resource "aws_dynamodb_table" "users-ddb" {
  name             = "potential-guacamole-users"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "FirstName"
  range_key        = "LastName"

  attribute {
    name = "FirstName"
    type = "S"
  }

  attribute {
    name = "LastName"
    type = "S"
  }

  replica {
    region_name = "us-east-2"
  }
}

resource "aws_iam_role" "users-ddb-iam-role" {
  name = "potential-guacamole-users-ddb-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })

  inline_policy {
    name = "potential-guacamole-users-ddb-access-policy"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:Query"]
          Effect   = "Allow"
          Resource = aws_dynamodb_table.users-ddb.id
        },
      ]
    })
  }
}