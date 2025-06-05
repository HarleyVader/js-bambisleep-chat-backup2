// MongoDB Initialization Script
db = db.getSiblingDB('admin');

// Create application user with access to all three databases
db.createUser({
  user: "bambisleep",
  pwd: passwordPrompt(),  // This will prompt for password during initialization
  roles: [
    { role: "readWrite", db: "profilesDB" },
    { role: "readWrite", db: "chatDB" },
    { role: "aigfLogsDB" }
  ]
});

// Initialize profilesDB
db = db.getSiblingDB('profilesDB');
db.createCollection('profiles');
db.createCollection('controls');
db.createCollection('sessions');
db.createCollection('userPreferences');
db.createCollection('spiralSettings');
db.createCollection('hypnosisSettings');
db.createCollection('collarSettings');
db.createCollection('triggerSettings');
db.createCollection('audioSettings');
db.createCollection('brainwaveSettings');

// Initialize chatDB
db = db.getSiblingDB('chatDB');
db.createCollection('messages');
db.createCollection('triggers');
db.createCollection('audioInteractions');
db.createCollection('userInteractions');
db.createCollection('urls');
db.createCollection('mentions');
db.createCollection('urlSafety');
db.createCollection('messageAttachments');
db.createCollection('clickedUrls');
db.createCollection('userTagInteractions');

// Initialize aigfLogsDB
db = db.getSiblingDB('aigfLogsDB');
db.createCollection('interactions');
db.createCollection('commands');
db.createCollection('performance');
db.createCollection('spiralInteractions');
db.createCollection('userCommands');
db.createCollection('chatSessions');
db.createCollection('userBehavior');
db.createCollection('errorLogs');

// Create indexes for better performance
db = db.getSiblingDB('profilesDB');
db.profiles.createIndex({ "username": 1 }, { unique: true });
db.sessions.createIndex({ "username": 1 });
db.sessions.createIndex({ "lastActive": 1 });
db.controls.createIndex({ "username": 1, "controlType": 1 });
db.spiralSettings.createIndex({ "username": 1 });
db.triggerSettings.createIndex({ "username": 1 });

db = db.getSiblingDB('chatDB');
db.messages.createIndex({ "timestamp": 1 });
db.messages.createIndex({ "username": 1 });
db.messages.createIndex({ "mentions.username": 1 });
db.audioInteractions.createIndex({ "timestamp": 1 });
db.audioInteractions.createIndex({ "triggerUser": 1, "targetUser": 1 });
db.userInteractions.createIndex({ "timestamp": 1 });
db.urls.createIndex({ "url": 1 }, { unique: true });
db.urlSafety.createIndex({ "url": 1 }, { unique: true });
db.urlSafety.createIndex({ "lastChecked": 1 });
db.clickedUrls.createIndex({ "url": 1 });
db.clickedUrls.createIndex({ "username": 1 });
db.clickedUrls.createIndex({ "timestamp": 1 });
db.userTagInteractions.createIndex({ "sourceUsername": 1 });
db.userTagInteractions.createIndex({ "targetUsername": 1 });
db.userTagInteractions.createIndex({ "timestamp": 1 });

db = db.getSiblingDB('aigfLogsDB');
db.interactions.createIndex({ "timestamp": 1 });
db.interactions.createIndex({ "username": 1 });
db.interactions.createIndex({ "interactionType": 1 });
db.spiralInteractions.createIndex({ "username": 1 });
db.userCommands.createIndex({ "command": 1 });
db.chatSessions.createIndex({ "sessionId": 1 });
db.chatSessions.createIndex({ "username": 1 });
db.errorLogs.createIndex({ "timestamp": 1 });

print("MongoDB initialization completed successfully!");
