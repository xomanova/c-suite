# Create websockets dynamodb
resource "aws_dynamodb_table" "rooms_ddb" {
  name             = "${var.project}-rooms"
  hash_key         = "room_id"
  billing_mode     = "PAY_PER_REQUEST"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "room_id"
    type = "S"
  }

  # Expire abandoned room records after a time
  attribute {
    name = "expiration"
    type = "Number"
  }

  ttl {
    attribute_name = "expiration"
    enabled        = true
  }
}
