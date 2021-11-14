# API Gateway resources
resource "aws_apigatewayv2_api" "websocket_api_gw" {
  name                       = "${var.project}-websocket-gw"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# Create IAM role for authorizer Lambda
data "aws_iam_policy_document" "AWSLambdaTrustPolicy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "websockets_api_authorizer_role" {
  name               = "${var.project}-websockets-authorizer-lambda"
  assume_role_policy = data.aws_iam_policy_document.AWSLambdaTrustPolicy.json
}

resource "aws_iam_role_policy_attachment" "authorizer_lambda_policy" {
  role       = aws_iam_role.websockets_api_authorizer_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "authorizer_lambda_zip" {
  type        = "zip"
  source_dir  = "src-websockets/authorizer"
  output_path = "authorizer.zip"
}

resource "aws_lambda_function" "authorizer_lambda" {
  filename         = "authorizer.zip"
  source_code_hash = data.archive_file.authorizer_lambda_zip.output_base64sha256
  function_name    = "${var.project}-authorizer-lambda"
  role             = aws_iam_role.websockets_function_role.arn
  description      = "Handle websocket authorizer requests"
  handler          = "index.handler"
  runtime          = "python3.8"
}

resource "aws_apigatewayv2_authorizer" "websocket_api_gw_auth" {
  api_id           = aws_apigatewayv2_api.websocket_api_gw.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = aws_lambda_function.authorizer_lambda.invoke_arn
  identity_sources = ["route.request.header.Auth"]
  name             = "${var.project}-websocket-gw-authorizer"
}

# Route53 CNAME record for websocket connections
resource "aws_route53_record" "socket" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "websockets-${var.project}.${var.aws_hosted_zone}"
  type    = "CNAME"
  ttl     = "300"
  records = [aws_apigatewayv2_api.websocket_api_gw.api_endpoint]
}

# Create websockets dynamodb
resource "aws_dynamodb_table" "websockets_ddb" {
  name             = "${var.project}-websockets"
  hash_key         = "connectionId"
  billing_mode     = "PAY_PER_REQUEST"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "connectionId"
    type = "S"
  }
}

# Create IAM role to read and write to dynamodb to be assumed by Lambda
resource "aws_iam_role" "websockets_function_role" {
  name               = "${var.project}-websockets-lambda"
  assume_role_policy = data.aws_iam_policy_document.AWSLambdaTrustPolicy.json

  inline_policy {
    name = "websockets-dynamodb-readwrite"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["dynamodb:*"]
          Effect   = "Allow"
          Resource = "${aws_dynamodb_table.websockets_ddb.arn}"
        },
      ]
    })
  }
}

resource "aws_iam_role_policy_attachment" "terraform_lambda_policy" {
  role       = aws_iam_role.websockets_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Websocket onconnect Lambda
data "archive_file" "onconnect_lambda_zip" {
  type        = "zip"
  source_dir  = "src-websockets/onconnect"
  output_path = "onconnect.zip"
}

resource "aws_lambda_function" "onconnect_lambda" {
  filename         = "onconnect.zip"
  source_code_hash = data.archive_file.onconnect_lambda_zip.output_base64sha256
  function_name    = "${var.project}-onconnect-lambda"
  role             = aws_iam_role.websockets_function_role.arn
  description      = "Handle websocket onconnect traffic"
  handler          = "index.handler"
  runtime          = "nodejs14.x"
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.websockets_ddb.name
    }
  }
}

# Websocket ondisconnect Lambda
data "archive_file" "ondisconnect_lambda_zip" {
  type        = "zip"
  source_dir  = "src-websockets/ondisconnect"
  output_path = "ondisconnect.zip"
}

resource "aws_lambda_function" "ondisconnect_lambda" {
  filename         = "ondisconnect.zip"
  source_code_hash = data.archive_file.ondisconnect_lambda_zip.output_base64sha256
  function_name    = "${var.project}-ondisconnect-lambda"
  role             = aws_iam_role.websockets_function_role.arn
  description      = "Handle websocket ondisconnect traffic"
  handler          = "index.handler"
  runtime          = "nodejs14.x"
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.websockets_ddb.name
    }
  }
}

# Websocket sendmessage Lambda
data "archive_file" "sendmessage_lambda_zip" {
  type        = "zip"
  source_dir  = "src-websockets/sendmessage"
  output_path = "sendmessage.zip"
}

resource "aws_lambda_function" "sendmessage_lambda" {
  filename         = "sendmessage.zip"
  source_code_hash = data.archive_file.sendmessage_lambda_zip.output_base64sha256
  function_name    = "${var.project}-sendmessage-lambda"
  role             = aws_iam_role.websockets_function_role.arn
  description      = "Handle websocket sendmessage traffic"
  handler          = "index.handler"
  runtime          = "nodejs14.x"
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.websockets_ddb.name
    }
  }
}
