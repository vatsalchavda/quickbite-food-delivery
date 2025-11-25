class BaseEvent {
  constructor(type, data) {
    this.type = type;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.id = this.generateId();
  }

  generateId() {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

module.exports = BaseEvent;
