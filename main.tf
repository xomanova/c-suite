terraform {
  backend "remote" {
    organization = "xomanova"
    workspaces {
      name = "potential-guacamole"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region     = "us-east-1"
}

data "aws_route53_zone" "zone" {
  name = "megrehn.com"
}

data "aws_acm_certificate" "acm_cert" {
  domain      = "megrehn.com"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}

variable "aws_access_key" {
  description = "Access key for AWS API calls from Terraform Cloud"
  type        = string
}

variable "aws_secret_key" {
  description = "Secret key for AWS API calls from Terraform Cloud"
  type        = string
}

variable "google_app_id" {
  description = "App ID for Google API calls from AWS Cognito"
  type        = string
}

variable "google_app_secret" {
  description = "Secret key for Google API calls from AWS Cognito"
  type        = string
}