resource "aws_apigatewayv2_api" "websocket_api_gw" {
  name                       = "${var.project}-websocket-gw"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}