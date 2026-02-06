const users = new Map();
const files = new Map();

const database = {
  createUser(user) {
    users.set(user.id, user);
    return user;
  },

  getUserById(id) {
    return users.get(id);
  },

  getUserByEmail(email) {
    for (let user of users.values()) {
      if (user.email === email) return user;
    }
    return null;
  },

  createFile(file) {
    if (!files.has(file.userId)) {
      files.set(file.userId, []);
    }
    files.get(file.userId).push(file);
    return file;
  },

  getFilesByUserId(userId) {
    return files.get(userId) || [];
  },

  getFileById(userId, fileId) {
    const userFiles = files.get(userId) || [];
    return userFiles.find(f => f.id === fileId);
  },

  deleteFile(userId, fileId) {
    const userFiles = files.get(userId) || [];
    const index = userFiles.findIndex(f => f.id === fileId);
    if (index > -1) {
      userFiles.splice(index, 1);
      return true;
    }
    return false;
  },

  getUserStorageUsage(userId) {
    const userFiles = files.get(userId) || [];
    return userFiles.reduce((total, file) => total + file.size, 0);
  }
};

module.exports = database;
