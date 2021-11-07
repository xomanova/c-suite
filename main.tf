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

variable "aws_access_key" {
  description = "Access key for AWS API calls from Terraform Cloud"
  type        = string
}

variable "aws_secret_key" {
  description = "Secret key for AWS API calls from Terraform Cloud"
  type        = string
}