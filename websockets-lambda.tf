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

resource "aws_lambda_permission" "gw_authorizer_lambda_permissions" {
  statement_id  = "AllowExecutionFromGW"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:*:${data.caller.account_id}:*/authorizers/*"
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

resource "aws_lambda_permission" "gw_onconnect_lambda_permissions" {
  statement_id  = "AllowExecutionFromGWonconnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.onconnect_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:*:${data.caller.account_id}:*/*/$connect"
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

resource "aws_lambda_permission" "gw_ondisconnect_lambda_permissions" {
  statement_id  = "AllowExecutionFromGWondisconnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ondisconnect_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:*:${data.caller.account_id}:*/*/$disconnect"
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

resource "aws_lambda_permission" "gw_sendmessage_lambda_permissions" {
  statement_id  = "AllowExecutionFromGWsendmessage"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sendmessage_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:*:${data.caller.account_id}:*/*/$default"
}