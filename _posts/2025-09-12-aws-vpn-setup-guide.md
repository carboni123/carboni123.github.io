---
layout: guide
title: "AWS VPN Setup Guide"
date: 2025-09-12
author: "Diego & LLMs"
---

# AWS Client VPN Setup Guide with Mutual Authentication

## Introduction

Securely connecting remote users or services to your private AWS resources is a critical task for any cloud infrastructure. AWS Client VPN offers a managed, scalable solution to bridge this gap, but ensuring that only authorized clients can connect is paramount. This guide will walk you through setting up a robust and secure VPN using one of the strongest authentication methods available: **mutual authentication (mTLS)**.

Unlike simpler authentication schemes, mutual authentication requires both the server (the AWS VPN endpoint) and the client (your remote machine) to cryptographically prove their identities to each other using digital certificates. This creates a zero-trust security posture where trust is never assumed, ensuring that only devices possessing a valid, unrevoked certificate can even initiate a connection. It eliminates the risks of compromised passwords and provides granular, certificate-based control over access.

In this step-by-step guide, we will cover the entire process, from generating your own Certificate Authority (CA) to connecting a Linux client. We will:

1.  Use **Easy-RSA** on a secure local machine to create the necessary certificates.
2.  Import the server certificate into **AWS Certificate Manager (ACM)**.
3.  Configure the **Client VPN endpoint**, including network associations, routes, and authorization rules.
4.  Set up an **OpenVPN client** on a Linux VPS to establish the secure tunnel.

By the end, you will have a fully functional and secure VPN, allowing your remote systems to privately access resources within your VPC without exposing them to the public internet. Let's get started.

## Prerequisites
- An AWS account with permissions for VPC, Client VPN endpoints, and AWS Certificate Manager (ACM).
- A VPC with at least one private subnet (associated with an internet gateway for outbound access if needed).
- AWS CLI installed and configured (optional but recommended for automation).
- A local admin machine (e.g., your laptop or a secure VM) for certificate generation—do not do this on production servers.
- A Linux VPS (e.g., Ubuntu) that will connect as the client.
- Basic knowledge of networking (CIDR blocks, routes) and OpenVPN.
- Costs: Client VPN charges per endpoint-hour (~$0.05/hour) and per connection-hour (~$0.10/hour). Data transfer fees apply. Check AWS pricing for details.
- Limits: RSA keys must be 1024 or 2048 bits (use 2048 for security); client certs require a Common Name (CN).

**Security Notes**:
- Generate certificates on a secure, offline machine. Never commit keys to repos or Docker images.
- Use strong passphrases for production CAs and keys (omitted here for simplicity; add with `--passin` in Easy-RSA).
- Plan for certificate revocation: Generate a CRL (Certificate Revocation List) if needed and upload to the endpoint.
- Rotate certificates periodically and use unique client certs per device/user for better revocation control.

## Step 1: Generate Certificates Locally
Use Easy-RSA to create a CA, server cert, and client cert. This is done on your admin machine.

1. Clone and set up Easy-RSA:
   ```bash
   git clone https://github.com/OpenVPN/easy-rsa.git
   cd easy-rsa/easyrsa3
   ```

2. Initialize PKI and build CA (add a passphrase in production with `./easyrsa build-ca`):
   ```bash
   ./easyrsa init-pki
   ./easyrsa build-ca nopass
   ```

3. Generate server certificate (include SAN for 'server'):
   ```bash
   ./easyrsa --subject-alt-name=DNS:server build-server-full server nopass
   ```

4. Generate client certificate for your VPS (repeat for multiple clients):
   ```bash
   ./easyrsa build-client-full vps1 nopass
   ```

Output files:
- CA: `pki/ca.crt`
- Server: `pki/issued/server.crt`, `pki/private/server.key`
- Client: `pki/issued/vps1.crt`, `pki/private/vps1.key`

Securely back up the CA key—it's needed for future certs or revocations.

## Step 2: Import Server Certificate to ACM
Import only the server cert and CA chain to ACM in the same region as your Client VPN endpoint. The client cert stays local.

### Option A: AWS Console
1. Go to AWS Console > Certificate Manager > Import a certificate.
2. Paste:
   - Certificate body: Contents of `server.crt`
   - Private key: Contents of `server.key` (PEM format, unencrypted)
   - Certificate chain: Contents of `ca.crt`
3. Import and note the ARN.

### Option B: AWS CLI (Recommended for Scripting)
From the directory with the files:
```bash
aws acm import-certificate --certificate fileb://server.crt --private-key fileb://server.key --certificate-chain fileb://ca.crt
```
Copy the returned ARN.

**Optional**: If using separate CAs or for explicit client auth, import the client cert similarly and note its ARN. For shared CA, reuse the server ARN for client auth.

## Step 3: Create the Client VPN Endpoint
1. Go to AWS Console > VPC > Client VPN endpoints > Create endpoint.
2. Settings:
   - Name and description (optional).
   - Client IPv4 CIDR: e.g., `172.27.0.0/22` (must not overlap VPC CIDR).
   - Server certificate ARN: Select your imported ARN.
   - Authentication: Mutual authentication; Client certificate ARN: Same as server (or client ARN if imported).
   - DNS servers (optional): Add your VPC DNS resolver (e.g., `172.31.0.2` for default VPCs).
   - Enable split-tunnel (recommended for efficiency—only VPC traffic routes through VPN).
   - Transport: UDP (faster); Port: 443 (less likely blocked).
3. Create the endpoint (state: `pending-associate`).

### Associate Subnets and Add Routes/Authorization
4. Select the endpoint > Target network associations > Associate: Choose your VPC and private subnet(s).
5. Routes: Add routes to your VPC CIDR (e.g., `172.31.0.0/16` targeting associated subnet). For internet access, add `0.0.0.0/0`.
6. Authorization rules: Add rules for destinations:
   - VPC CIDR (e.g., `172.31.0.0/16`) or specific subnets/DBs.
   - Allow access to "All users" (for mTLS).
   - For DNS: Ensure rule includes VPC resolver IP (e.g., `172.31.0.2/32`).
7. Security groups: Attach a SG allowing outbound UDP/TCP 53 (DNS) and other needed traffic. Defaults often allow all egress.

State changes to `available` after first association.

## Step 4: Configure and Connect from Your VPS
Use OpenVPN on Linux (AWS also provides a native client, but OpenVPN is standard).

1. Install OpenVPN:
   ```bash
   sudo apt update && sudo apt install -y openvpn
   ```

2. Download the `.ovpn` config from AWS Console > Client VPN endpoint > Download client configuration.

3. Securely copy files to VPS (e.g., via SCP):
   - `/etc/openvpn/client/ca.crt` (from `pki/ca.crt`)
   - `/etc/openvpn/client/vps1.crt` (from `pki/issued/vps1.crt`)
   - `/etc/openvpn/client/vps1.key` (from `pki/private/vps1.key`)
   - Place downloaded `client.ovpn` in `/etc/openvpn/client/`

4. Edit `client.ovpn` to reference files:
   ```
   ca /etc/openvpn/client/ca.crt
   cert /etc/openvpn/client/vps1.crt
   key /etc/openvpn/client/vps1.key
   ```

5. Start OpenVPN:
   ```bash
   sudo openvpn --config /etc/openvpn/client/client.ovpn --daemon
   ```

6. Install as a systemd service for persistence:
   ```bash
   sudo mv /etc/openvpn/client/client.ovpn /etc/openvpn/client.conf
   sudo systemctl enable --now openvpn@client
   sudo systemctl status openvpn@client
   ```
   (Routes to VPC are automatically pushed; Docker containers on the host use host routing.)


For multiple clients, generate unique certs per VPS/user. This setup ensures secure, private access without public endpoints. Test thoroughly before production.