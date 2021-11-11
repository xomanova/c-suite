resource "aws_apigatewayv2_api" "websocket_api_gw" {
  name                       = "${var.project}-websocket-gw"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# Route53 CNAME record
resource "aws_route53_record" "socket" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "websockets-${var.project}.${var.aws_hosted_zone}"
  type    = "CNAME"
  ttl     = "300"
  records = [aws_apigatewayv2_api.websocket_api_gw.apiendpoint]
}