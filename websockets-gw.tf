# API Gateway resources
resource "aws_apigatewayv2_api" "websocket_api_gw" {
  name                         = "${var.project}-websocket-gw"
  protocol_type                = "WEBSOCKET"
  route_selection_expression   = "$request.body.action"
  api_key_selection_expression = "$context.authorizer.usageIdentifierKey"
  credentials_arn              = aws_iam_role.websockets_gw_role.arn
}

resource "aws_apigatewayv2_authorizer" "websocket_api_gw_auth" {
  api_id                     = aws_apigatewayv2_api.websocket_api_gw.id
  authorizer_type            = "REQUEST"
  authorizer_uri             = aws_lambda_function.authorizer_lambda.invoke_arn
  authorizer_credentials_arn = aws_iam_role.websockets_gw_role.arn
  name                       = "${var.project}-websocket-gw-authorizer"
}

# Create IAM role for websockets gateway
data "aws_iam_policy_document" "AWSApiGatewayTrustPolicy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "websockets_gw_role" {
  name               = "${var.project}-websockets-gw-role"
  assume_role_policy = data.aws_iam_policy_document.AWSApiGatewayTrustPolicy.json

  inline_policy {
    name = "websockets-lambda-invoke"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action = ["lambda:InvokeFunction"]
          Effect = "Allow"
          Resource = [
            "${aws_lambda_function.authorizer_lambda.arn}",
            "${aws_lambda_function.onconnect_lambda.arn}",
            "${aws_lambda_function.ondisconnect_lambda.arn}",
            "${aws_lambda_function.sendmessage_lambda.arn}"
          ]
        },
      ]
    })
  }
}

resource "aws_apigatewayv2_stage" "live" {
  api_id = aws_apigatewayv2_api.websocket_api_gw.id
  name   = "socket"

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
    logging_level          = "INFO"
    data_trace_enabled     = true
  }

}

// Deploy resources not working as intended with timerstamp trigger
// https://github.com/xomanova/potential-guacamole/issues/5
resource "aws_apigatewayv2_deployment" "deploy_gw" {
  api_id      = aws_apigatewayv2_api.websocket_api_gw.id
  description = md5(file("websockets-gw.tf"))

  triggers = {
    timestamp = timestamp()
  }

  lifecycle {
    create_before_destroy = true
  }
  depends_on = [
    aws_apigatewayv2_api.websocket_api_gw,
    aws_apigatewayv2_stage.live,
    aws_apigatewayv2_route.websocket_ondisconnect_route,
    aws_apigatewayv2_route.websocket_ondisconnect_route,
    aws_apigatewayv2_route.websocket_default_route
  ]
}


resource "aws_apigatewayv2_integration" "websocket_onconnect_lambda_integration" {
  api_id           = aws_apigatewayv2_api.websocket_api_gw.id
  integration_type = "AWS_PROXY"

  content_handling_strategy = "CONVERT_TO_TEXT"
  description               = "Websocket onconnect Lambda GW integration"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.onconnect_lambda.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"
}

resource "aws_apigatewayv2_integration_response" "websocket_onconnect_lambda_integration_resp" {
  api_id                   = aws_apigatewayv2_api.websocket_api_gw.id
  integration_id           = aws_apigatewayv2_integration.websocket_onconnect_lambda_integration.id
  integration_response_key = "/200/"
}

resource "aws_apigatewayv2_route" "websocket_onconnect_route" {
  api_id    = aws_apigatewayv2_api.websocket_api_gw.id
  route_key = "$connect"

  target = "integrations/${aws_apigatewayv2_integration.websocket_onconnect_lambda_integration.id}"
}

resource "aws_apigatewayv2_integration" "websocket_ondisconnect_lambda_integration" {
  api_id           = aws_apigatewayv2_api.websocket_api_gw.id
  integration_type = "AWS_PROXY"

  content_handling_strategy = "CONVERT_TO_TEXT"
  description               = "Websocket ondisconnect Lambda GW integration"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.ondisconnect_lambda.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"
}

resource "aws_apigatewayv2_integration_response" "websocket_ondisconnect_lambda_integration_resp" {
  api_id                   = aws_apigatewayv2_api.websocket_api_gw.id
  integration_id           = aws_apigatewayv2_integration.websocket_ondisconnect_lambda_integration.id
  integration_response_key = "/200/"
}

resource "aws_apigatewayv2_route" "websocket_ondisconnect_route" {
  api_id    = aws_apigatewayv2_api.websocket_api_gw.id
  route_key = "$disconnect"

  target = "integrations/${aws_apigatewayv2_integration.websocket_ondisconnect_lambda_integration.id}"
}


resource "aws_apigatewayv2_integration" "websocket_sendmessage_lambda_integration" {
  api_id           = aws_apigatewayv2_api.websocket_api_gw.id
  integration_type = "AWS_PROXY"

  content_handling_strategy = "CONVERT_TO_TEXT"
  description               = "Websocket sendmessage Lambda GW integration"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.sendmessage_lambda.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"
}

resource "aws_apigatewayv2_integration_response" "websocket_sendmessage_lambda_integration_resp" {
  api_id                   = aws_apigatewayv2_api.websocket_api_gw.id
  integration_id           = aws_apigatewayv2_integration.websocket_sendmessage_lambda_integration.id
  integration_response_key = "/200/"
}

resource "aws_apigatewayv2_route" "websocket_default_route" {
  api_id    = aws_apigatewayv2_api.websocket_api_gw.id
  route_key = "$default"

  target = "integrations/${aws_apigatewayv2_integration.websocket_sendmessage_lambda_integration.id}"
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

  # Expire abandoned connection records after a time

  ttl {
    attribute_name = "expiration"
    enabled        = true
  }
}