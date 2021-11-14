# API Gateway resources
resource "aws_apigatewayv2_api" "websocket_api_gw" {
  name                         = "${var.project}-websocket-gw"
  protocol_type                = "WEBSOCKET"
  route_selection_expression   = "$request.body.action"
  api_key_selection_expression = "$context.authorizer.usageIdentifierKey"
}

resource "aws_apigatewayv2_authorizer" "websocket_api_gw_auth" {
  api_id           = aws_apigatewayv2_api.websocket_api_gw.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = aws_lambda_function.authorizer_lambda.invoke_arn
  identity_sources = ["route.request.header.Auth"]
  name             = "${var.project}-websocket-gw-authorizer"
}

resource "aws_apigatewayv2_stage" "live" {
  api_id = aws_apigatewayv2_api.websockets_api_gw.id
  name   = "live"

  depends_on = [
    aws_apigatewayv2_api.websockets_api_gw
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


# Route53 CNAME record for websocket connections
resource "aws_route53_record" "socket" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "websockets-${var.project}.${var.aws_hosted_zone}"
  type    = "CNAME"
  ttl     = "300"
  records = [element(split("//", aws_apigatewayv2_api.websocket_api_gw.api_endpoint), 1)]
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