# 📙 MongoDB Setup Guide for BambiSleep.Chat

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Linux Installation](#linux-installation)
  - [Windows Installation](#windows-installation)
  - [macOS Installation](#macos-installation)
  - [Docker Installation](#docker-installation)
- [Configuration](#configuration)
  - [Basic Configuration](#basic-configuration)
  - [Security Configuration](#security-configuration)
  - [Performance Tuning](#performance-tuning)
- [Database Setup](#database-setup)
  - [Creating Databases](#creating-databases)
  - [Creating Collections](#creating-collections)
  - [User Management](#user-management)
- [Connection Testing](#connection-testing)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Introduction

BambiSleep.Chat uses MongoDB for storing user profiles, session data, chat histories, triggers, and other application data. This guide provides detailed instructions for setting up and configuring MongoDB for use with BambiSleep.Chat.

## Prerequisites

Before installing MongoDB, ensure your system meets these requirements:

- 64-bit operating system (Windows 10+, Ubuntu 20.04+, macOS 12+)
- Minimum 4GB RAM (8GB+ recommended)
- At least 10GB free disk space
- Internet connection for downloading packages
- Administrative/root access to the system

## Installation

### Linux Installation

#### Ubuntu/Debian-based Systems

1. Import the MongoDB GPG key:
   ```bash
   curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
   ```

2. Add MongoDB repository:
   ```bash
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   ```

3. Update and install MongoDB:
   ```bash
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```

4. Start and enable MongoDB service:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

5. Verify installation:
   ```bash
   mongod --version
   ```

#### RHEL/CentOS/Fedora

1. Create a repository file:
   ```bash
   sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo<<EOF
   [mongodb-org-6.0]
   name=MongoDB Repository
   baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
   gpgcheck=1
   enabled=1
   gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
   EOF
   ```

2. Install MongoDB:
   ```bash
   sudo yum install -y mongodb-org
   ```

3. Start and enable service:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. Verify installation:
   ```bash
   mongod --version
   ```

### Windows Installation

1. Download the MongoDB Community Server installer from the [official MongoDB website](https://www.mongodb.com/try/download/community).

2. Run the installer:
   - Select "Complete" installation
   - Choose "Run service as Network Service user"
   - Install MongoDB Compass (optional but recommended)

3. Verify installation:
   - Open Command Prompt and run:
   ```cmd
   "C:\Program Files\MongoDB\Server\6.0\bin\mongo.exe" --version
   ```

4. MongoDB service should start automatically. If not:
   ```cmd
   net start MongoDB
   ```

### macOS Installation

1. Install using Homebrew (recommended):
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. Start MongoDB service:
   ```bash
   brew services start mongodb-community
   ```

3. Verify installation:
   ```bash
   mongod --version
   ```

### Docker Installation

1. Pull the official MongoDB image:
   ```bash
   docker pull mongo:6.0
   ```

2. Create a directory for MongoDB data:
   ```bash
   mkdir -p ~/mongodb/data
   ```

3. Start MongoDB container:
   ```bash
   docker run -d --name bambisleep-mongodb -p 27017:27017 \
     -v ~/mongodb/data:/data/db \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=your_secure_password \
     mongo:6.0
   ```

4. Verify container is running:
   ```bash
   docker ps | grep bambisleep-mongodb
   ```

## Configuration

### Basic Configuration

The default MongoDB configuration works for development, but for production, edit the MongoDB configuration file:

- **Linux**: `/etc/mongod.conf`
- **Windows**: `C:\Program Files\MongoDB\Server\6.0\bin\mongod.cfg`
- **macOS** (Homebrew): `/usr/local/etc/mongod.conf`

Basic configuration example:

```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
```

After changing the configuration, restart MongoDB:
```bash
sudo systemctl restart mongod
```

### Security Configuration

For production environments, enable security features:

1. Create an admin user:
   ```javascript
   use admin
   db.createUser({
     user: "admin",
     pwd: "secure_password",
     roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
   })
   ```

2. Enable authentication in `mongod.conf`:
   ```yaml
   security:
     authorization: enabled
   ```

3. Restart MongoDB:
   ```bash
   sudo systemctl restart mongod
   ```

4. Connect with authentication:
   ```bash
   mongosh --host localhost --port 27017 -u admin -p secure_password --authenticationDatabase admin
   ```

### Performance Tuning

For optimal performance with BambiSleep.Chat, consider these settings:

```yaml
# In mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2  # Adjust based on available RAM (50% of RAM minus 1GB)

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

net:
  maxIncomingConnections: 500
```

## Database Setup

### Creating Databases

BambiSleep.Chat requires two databases:

1. Connect to MongoDB:
   ```bash
   mongosh --host localhost --port 27017 -u admin -p secure_password --authenticationDatabase admin
   ```

2. Create main database:
   ```javascript
   use bambisleep
   ```

3. Create profiles database:
   ```javascript
   use bambisleep-profiles
   ```

### Creating Collections

Set up required collections:

```javascript
// Switch to main database
use bambisleep

// Create collections with validators
db.createCollection("chat_messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["content", "username", "timestamp"],
      properties: {
        content: { bsonType: "string" },
        username: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        processed: { bsonType: "bool" }
      }
    }
  }
})

db.createCollection("session_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sessionId", "username", "messages"],
      properties: {
        sessionId: { bsonType: "string" },
        username: { bsonType: "string" },
        startTime: { bsonType: "date" },
        endTime: { bsonType: "date" },
        messages: { bsonType: "array" }
      }
    }
  }
})

// Switch to profiles database
use bambisleep-profiles

// Create profiles collection
db.createCollection("profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "displayName", "createdAt"],
      properties: {
        username: { bsonType: "string" },
        displayName: { bsonType: "string" },
        avatarUrl: { bsonType: "string" },
        isPublic: { bsonType: "bool" },
        xp: { bsonType: "int" },
        level: { bsonType: "int" },
        createdAt: { bsonType: "date" },
        triggers: { bsonType: "array" }
      }
    }
  }
})

// Create indexes for better performance
db.profiles.createIndex({ "username": 1 }, { unique: true })
db.profiles.createIndex({ "isPublic": 1 })

use bambisleep
db.chat_messages.createIndex({ "timestamp": -1 })
db.session_history.createIndex({ "username": 1 })
db.session_history.createIndex({ "sessionId": 1 }, { unique: true })
```

### User Management

Create application-specific users:

```javascript
// Switch to admin database
use admin

// Create application user for main database
db.createUser({
  user: "bambisleep_app",
  pwd: "strong_password_1",
  roles: [
    { role: "readWrite", db: "bambisleep" }
  ]
})

// Create application user for profiles database
db.createUser({
  user: "bambisleep_profiles",
  pwd: "strong_password_2",
  roles: [
    { role: "readWrite", db: "bambisleep-profiles" }
  ]
})
```

## Connection Testing

Test MongoDB connection:

1. From the BambiSleep.Chat application directory, run:
   ```bash
   npm run test:mongodb
   ```

2. Or manually test with mongosh:
   ```bash
   mongosh "mongodb://bambisleep_app:strong_password_1@localhost:27017/bambisleep?authSource=admin"
   ```

3. Verify connection to profiles database:
   ```bash
   mongosh "mongodb://bambisleep_profiles:strong_password_2@localhost:27017/bambisleep-profiles?authSource=admin"
   ```

## Backup and Restore

### Creating Backups

1. Back up entire database:
   ```bash
   mongodump --host localhost --port 27017 -u admin -p secure_password --authenticationDatabase admin --out /backup/$(date +"%Y-%m-%d")
   ```

2. Back up specific database:
   ```bash
   mongodump --host localhost --port 27017 -u admin -p secure_password --authenticationDatabase admin --db bambisleep --out /backup/$(date +"%Y-%m-%d")
   ```

### Restoring from Backup

1. Restore entire backup:
   ```bash
   mongorestore --host localhost --port 27017 -u admin -p secure_password --authenticationDatabase admin /backup/2025-05-20/
   ```

2. Restore specific database:
   ```bash
   mongorestore --host localhost --port 27017 -u admin -p secure_password --authenticationDatabase admin --db bambisleep /backup/2025-05-20/bambisleep/
   ```

## Troubleshooting

### Common Issues

#### Connection Refused
```
Error: MongoNetworkError: connect ECONNREFUSED
```
- Ensure MongoDB service is running: `sudo systemctl status mongod`
- Check MongoDB is listening on the right port: `netstat -tulpn | grep mongod`
- Verify firewall settings: `sudo ufw status`

#### Authentication Failed
```
Error: Authentication failed
```
- Verify username and password
- Check the authSource parameter (should be "admin" for admin users)
- Confirm the user has appropriate roles

#### Disk Space Issues
```
Error: WiredTiger Error: No space left on device
```
- Check available disk space: `df -h`
- Clean up or expand disk
- Consider implementing log rotation

#### Performance Issues
- Check system resources: `htop`
- Analyze slow queries: Enable profiling level 1
- Check indexes with `db.collection.getIndexes()`

### MongoDB Logs

Log locations:
- **Linux**: `/var/log/mongodb/mongod.log`
- **Windows**: `C:\Program Files\MongoDB\Server\6.0\log\mongod.log`
- **macOS**: `/usr/local/var/log/mongodb/mongo.log`
- **Docker**: `docker logs bambisleep-mongodb`

## Advanced Topics

### Replication

For high availability, set up a MongoDB replica set:

1. Modify configuration files on each server:
   ```yaml
   replication:
     replSetName: "bambisleep_rs"
   ```

2. Restart MongoDB on each server

3. Connect to primary and initialize:
   ```javascript
   rs.initiate({
     _id: "bambisleep_rs",
     members: [
       { _id: 0, host: "mongo1:27017" },
       { _id: 1, host: "mongo2:27017" },
       { _id: 2, host: "mongo3:27017" }
     ]
   })
   ```

4. Update connection strings:
   ```
   mongodb://user:password@mongo1:27017,mongo2:27017,mongo3:27017/bambisleep?replicaSet=bambisleep_rs&authSource=admin
   ```

### Sharding

For very large deployments:

1. Set up config servers (replica set)
2. Set up shard servers (replica sets)
3. Set up mongos routers
4. Configure sharding on databases and collections

### Monitoring

Set up MongoDB monitoring:
- MongoDB Compass (GUI tool)
- MongoDB Cloud Manager
- Prometheus with MongoDB exporter
- Grafana dashboards

---

For additional help, contact the BambiSleep development team at dev@bambisleep.chat

Last updated: May 20, 2025
