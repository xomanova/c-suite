# S3 bucket for static content
resource "aws_s3_bucket" "www_bucket" {
  bucket = "${var.project}-site"
  acl    = "private"
}

locals {
  s3_origin_id  = "S3Origin"
  src_files_raw = fileset("src/", "**")
  no_html_files = toset([
    for file in local.src_files_raw :
    file if !(element(split(".", file), length(split(".", file)) - 1) == "html")
  ])
  html_files = toset([
    for file in local.src_files_raw :
    file if(element(split(".", file), length(split(".", file)) - 1) == "html")
  ])
}


resource "aws_s3_bucket_object" "html_objects" {
  for_each     = local.html_files
  bucket       = aws_s3_bucket.www_bucket.id
  key          = each.value
  content_type = "text/html"
  acl          = "public-read"
  source       = "src/${each.value}"
  etag         = filemd5("src/${each.value}")
}

resource "aws_s3_bucket_object" "js_objects" {
  for_each = local.no_html_files
  bucket   = aws_s3_bucket.www_bucket.id
  key      = each.value
  acl      = "public-read"
  source   = "src/${each.value}"
  etag     = filemd5("src/${each.value}")
}



resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.www_bucket.bucket_regional_domain_name
    origin_id   = local.s3_origin_id
  }

  origin {
    domain_name = "${aws_apigatewayv2_api.websocket_api_gw.id}.execute-api.${data.aws_region.current_region.name}.amazonaws.com"
    origin_id   = "apigw"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "match-viewer"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  price_class         = "PriceClass_200"
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["${var.project}.${var.aws_hosted_zone}"]

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/socket/socket.io.js.map"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/socket/socket.io.js"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/socket/robust-websockets.js"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/socket/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "apigw"

    default_ttl = 0
    min_ttl     = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    # lambda_function_association {
    #   event_type   = "viewer-request"
    #   lambda_arn   = aws_lambda_function.websockets_edge_lambda.qualified_arn
    #   include_body = false
    # }

    viewer_protocol_policy = "allow-all"
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.acm_cert.arn
    minimum_protocol_version = "TLSv1"
    ssl_support_method       = "sni-only"
  }
}

# lambda@edge for websockets path
# data "archive_file" "websockets_path_lambda_zip" {
#   type        = "zip"
#   source_dir  = "src-websockets/cf-edge"
#   output_path = "cf-edge.zip"
# }

# resource "aws_lambda_function" "websockets_edge_lambda" {
#   filename         = "cf-edge.zip"
#   source_code_hash = data.archive_file.ondisconnect_lambda_zip.output_base64sha256
#   function_name    = "${var.project}-edge-lambda"
#   role             = aws_iam_role.websockets_function_role.arn
#   description      = "Update websocket path traffic"
#   handler          = "index.handler"
#   runtime          = "nodejs14.x"
#   publish          = true
# }

# Route53 CNAME record
resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "${var.project}.${var.aws_hosted_zone}"
  type    = "CNAME"
  ttl     = "300"
  records = [aws_cloudfront_distribution.s3_distribution.domain_name]
}