#!/usr/bin/env node
/**
 * Complete Database Setup Script for BambiSleep.Chat
 * Based on codebase analysis and existing mongo-init configuration
 */

import mongoose from 'mongoose';
import Logger from './src/utils/logger.js';

const logger = new Logger('DB-Setup');

// MongoDB configuration - using docker-compose instance
const MONGODB_CONFIG = {
  // Docker-compose MongoDB (port 27018) - with proper authentication
  host: 'localhost',
  port: 27018,
  username: 'brandynette',
  password: 'bambibrandybomboBarbieAdminPassgoodGirlSMakeMoreGoodGirls',
  authSource: 'admin'
};

// Database names from mongo-init configuration
const DATABASES = {
  PROFILES: 'profilesDB',
  CHAT: 'chatDB', 
  AIGF_LOGS: 'aigfLogsDB'
};

// Collections configuration from mongo-init.js and codebase analysis
const COLLECTIONS_CONFIG = {
  [DATABASES.PROFILES]: [
    'profiles',
    'controls', 
    'sessions',
    'userPreferences',
    'spiralSettings',
    'hypnosisSettings',
    'collarSettings',
    'triggerSettings',
    'audioSettings',
    'brainwaveSettings'
  ],
  [DATABASES.CHAT]: [
    'messages',
    'triggers',
    'audioInteractions',
    'userInteractions', 
    'urls',
    'mentions',
    'urlSafety',
    'messageAttachments',
    'clickedUrls',
    'userTagInteractions'
  ],
  [DATABASES.AIGF_LOGS]: [
    'interactions',
    'commands',
    'performance',
    'spiralInteractions',
    'userCommands',
    'chatSessions',
    'userBehavior',
    'errorLogs'
  ]
};

// Index configurations from mongo-init.js
const INDEXES_CONFIG = {
  [DATABASES.PROFILES]: {
    'profiles': [
      { fields: { 'username': 1 }, options: { unique: true } },
    ],
    'sessions': [
      { fields: { 'username': 1 } },
      { fields: { 'lastActive': 1 } }
    ],
    'controls': [
      { fields: { 'username': 1, 'controlType': 1 } }
    ],
    'spiralSettings': [
      { fields: { 'username': 1 } }
    ],
    'triggerSettings': [
      { fields: { 'username': 1 } }
    ]
  },
  [DATABASES.CHAT]: {
    'messages': [
      { fields: { 'timestamp': 1 } },
      { fields: { 'username': 1 } },
      { fields: { 'mentions.username': 1 } }
    ],
    'audioInteractions': [
      { fields: { 'timestamp': 1 } },
      { fields: { 'triggerUser': 1, 'targetUser': 1 } }
    ],
    'userInteractions': [
      { fields: { 'timestamp': 1 } }
    ],
    'urls': [
      { fields: { 'url': 1 }, options: { unique: true } }
    ],
    'urlSafety': [
      { fields: { 'url': 1 }, options: { unique: true } },
      { fields: { 'lastChecked': 1 } }
    ],
    'clickedUrls': [
      { fields: { 'url': 1 } },
      { fields: { 'username': 1 } },
      { fields: { 'timestamp': 1 } }
    ],
    'userTagInteractions': [
      { fields: { 'sourceUsername': 1 } },
      { fields: { 'targetUsername': 1 } },
      { fields: { 'timestamp': 1 } }
    ]
  },
  [DATABASES.AIGF_LOGS]: {
    'interactions': [
      { fields: { 'timestamp': 1 } },
      { fields: { 'username': 1 } },
      { fields: { 'interactionType': 1 } }
    ],
    'spiralInteractions': [
      { fields: { 'username': 1 } }
    ],
    'userCommands': [
      { fields: { 'command': 1 } }
    ],
    'chatSessions': [
      { fields: { 'sessionId': 1 } },
      { fields: { 'username': 1 } }
    ],
    'errorLogs': [
      { fields: { 'timestamp': 1 } }
    ]
  }
};

/**
 * Build MongoDB connection string
 */
function buildConnectionString(database = 'admin') {
  const { host, port, username, password, authSource } = MONGODB_CONFIG;
  return `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=${authSource}`;
}

/**
 * Connect to a specific database
 */
async function connectToDatabase(database) {
  const uri = buildConnectionString(database);
  logger.info(`Connecting to ${database} database...`);
  
  try {
    const connection = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    
    logger.success(`Connected to ${database} database`);
    return connection;
  } catch (error) {
    logger.error(`Failed to connect to ${database}: ${error.message}`);
    throw error;
  }
}

/**
 * Create collections for a database
 */
async function createCollections(connection, database) {
  const collections = COLLECTIONS_CONFIG[database];
  logger.info(`Creating ${collections.length} collections in ${database}...`);
  
  for (const collectionName of collections) {
    try {
      await connection.db.createCollection(collectionName);
      logger.debug(`✓ Created collection: ${collectionName}`);
    } catch (error) {
      if (error.code === 48) {
        logger.debug(`✓ Collection already exists: ${collectionName}`);
      } else {
        logger.warning(`Failed to create collection ${collectionName}: ${error.message}`);
      }
    }
  }
}

/**
 * Create indexes for a database
 */
async function createIndexes(connection, database) {
  const indexConfig = INDEXES_CONFIG[database];
  if (!indexConfig) {
    logger.debug(`No indexes configured for ${database}`);
    return;
  }
  
  logger.info(`Creating indexes in ${database}...`);
  
  for (const [collectionName, indexes] of Object.entries(indexConfig)) {
    const collection = connection.db.collection(collectionName);
    
    for (const indexDef of indexes) {
      try {
        await collection.createIndex(indexDef.fields, indexDef.options || {});
        const fieldNames = Object.keys(indexDef.fields).join(', ');
        logger.debug(`✓ Created index on ${collectionName}: ${fieldNames}`);
      } catch (error) {
        if (error.code === 85) {
          logger.debug(`✓ Index already exists on ${collectionName}`);
        } else {
          logger.warning(`Failed to create index on ${collectionName}: ${error.message}`);
        }
      }
    }
  }
}

/**
 * Create application user with proper permissions
 */
async function createApplicationUser() {
  const adminUri = buildConnectionString('admin');
  logger.info('Creating application user...');
  
  try {
    const adminConnection = await mongoose.createConnection(adminUri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    // Check if user already exists
    const adminDb = adminConnection.db;
    const users = await adminDb.admin().listUsers();
    const existingUser = users.users.find(user => user.user === 'bambisleep');
    
    if (existingUser) {
      logger.info('✓ Application user "bambisleep" already exists');
    } else {
      // Create the application user as defined in mongo-init.js
      await adminDb.admin().addUser('bambisleep', 'bambiAppPass456', {
        roles: [
          { role: 'readWrite', db: DATABASES.PROFILES },
          { role: 'readWrite', db: DATABASES.CHAT },
          { role: 'readWrite', db: DATABASES.AIGF_LOGS }
        ]
      });
      logger.success('✓ Created application user "bambisleep"');
    }
    
    await adminConnection.close();
  } catch (error) {
    logger.error(`Failed to create application user: ${error.message}`);
    throw error;
  }
}

/**
 * Setup a single database
 */
async function setupDatabase(database) {
  logger.info(`\n🔧 Setting up ${database} database...`);
  
  const connection = await connectToDatabase(database);
  
  try {
    await createCollections(connection, database);
    await createIndexes(connection, database);
    
    // Get collection count
    const collections = await connection.db.listCollections().toArray();
    logger.success(`✓ ${database} setup complete (${collections.length} collections)`);
    
  } finally {
    await connection.close();
  }
}

/**
 * Verify database setup
 */
async function verifySetup() {
  logger.info('\n🔍 Verifying database setup...');
  
  for (const database of Object.values(DATABASES)) {
    const connection = await connectToDatabase(database);
    
    try {
      const collections = await connection.db.listCollections().toArray();
      const expectedCollections = COLLECTIONS_CONFIG[database];
      
      logger.info(`📊 ${database}: ${collections.length}/${expectedCollections.length} collections`);
      
      // Check if all expected collections exist
      const existingNames = collections.map(c => c.name);
      const missing = expectedCollections.filter(name => !existingNames.includes(name));
      
      if (missing.length > 0) {
        logger.warning(`Missing collections in ${database}: ${missing.join(', ')}`);
      } else {
        logger.success(`✓ All collections present in ${database}`);
      }
      
    } finally {
      await connection.close();
    }
  }
}

/**
 * Main setup function
 */
async function setupDatabases() {
  try {
    logger.info('🚀 Starting BambiSleep.Chat Database Setup');
    logger.info('=====================================');
    logger.info(`Target: MongoDB on ${MONGODB_CONFIG.host}:${MONGODB_CONFIG.port}`);
    logger.info(`Databases: ${Object.values(DATABASES).join(', ')}`);
    
    // Step 1: Create application user
    logger.info('\n📝 Step 1: Creating application user...');
    await createApplicationUser();
    
    // Step 2: Setup each database
    logger.info('\n🗄️ Step 2: Setting up databases...');
    for (const database of Object.values(DATABASES)) {
      await setupDatabase(database);
    }
    
    // Step 3: Verify setup
    logger.info('\n✅ Step 3: Verification...');
    await verifySetup();
    
    logger.info('\n🎉 Database setup completed successfully!');
    logger.info('\n💡 Next steps:');
    logger.info('   1. Update your .env file with the connection strings');
    logger.info('   2. Test the application connection');
    logger.info('   3. Run your application');
    
    logger.info('\n🔗 Connection strings to use:');
    logger.info(`   MONGODB_URI=mongodb://bambisleep:bambiAppPass456@localhost:27018/${DATABASES.PROFILES}?authSource=admin`);
    logger.info(`   MONGODB_CHAT=mongodb://bambisleep:bambiAppPass456@localhost:27018/${DATABASES.CHAT}?authSource=admin`);
    logger.info(`   MONGODB_AIGF_LOGS=mongodb://bambisleep:bambiAppPass456@localhost:27018/${DATABASES.AIGF_LOGS}?authSource=admin`);
    
  } catch (error) {
    logger.error('❌ Database setup failed:', error.message);
    logger.error('💡 Make sure MongoDB is running and accessible');
    process.exit(1);
  }
}

// Run the setup
setupDatabases();
