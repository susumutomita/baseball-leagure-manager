provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "baseball-league-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}

module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 18.0"

  cluster_name = "baseball-league-eks"
  cluster_version = "1.24"

  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      desired_size = 2
      min_size     = 1
      max_size     = 3

      instance_types = ["t3.medium"]
    }
  }

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}

module "rds" {
  source = "terraform-aws-modules/rds/aws"
  version = "~> 5.0"

  identifier = "baseball-league-db"

  engine               = "postgres"
  engine_version       = "14.6"
  family               = "postgres14"
  major_engine_version = "14"
  instance_class       = "db.t3.medium"

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "baseball_league_production"
  username = var.db_username
  password = var.db_password
  port     = 5432

  multi_az               = true
  subnet_ids             = module.vpc.private_subnets
  vpc_security_group_ids = [module.security_group_rds.security_group_id]

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  backup_retention_period = 7
  deletion_protection     = true

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}

module "security_group_rds" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 4.0"

  name        = "baseball-league-rds-sg"
  description = "PostgreSQL security group"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}

module "elasticache" {
  source = "terraform-aws-modules/elasticache/aws"
  version = "~> 3.0"

  name = "baseball-league-redis"
  engine = "redis"
  engine_version = "7.0"
  node_type = "cache.t3.small"
  num_cache_nodes = 1
  port = 6379

  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [module.security_group_redis.security_group_id]

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "baseball-league-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

module "security_group_redis" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 4.0"

  name        = "baseball-league-redis-sg"
  description = "Redis security group"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      description = "Redis access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}

resource "aws_ecr_repository" "app" {
  name = "baseball-league-manager"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Terraform = "true"
    Environment = var.environment
    Project = "baseball-league-manager"
  }
}
