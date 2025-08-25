/**
 * Basic Setup Example for AI Automation with n8n
 * 
 * This example shows how to set up a basic automation system
 * that integrates AI services with social media platforms.
 */

const axios = require('axios');

class AutomationSetup {
  constructor(config) {
    this.n8nWebhookUrl = config.n8nWebhookUrl;
    this.wanApiKey = config.wanApiKey;
    this.database = config.database;
  }

  /**
   * Create a new automation job
   * @param {Object} jobData - Job configuration
   * @returns {Promise<Object>} Job result
   */
  async createJob(jobData) {
    try {
      // Validate input
      this.validateJobData(jobData);

      // Get user credentials
      const credentials = await this.getUserCredentials(jobData.userId, jobData.platform);

      // Prepare payload for n8n
      const payload = {
        user_id: jobData.userId,
        prompt: jobData.prompt,
        platform: jobData.platform,
        caption: jobData.caption,
        access_token: credentials.access_token,
        schedule_time: jobData.scheduleTime || null
      };

      // Send to n8n webhook
      const response = await axios.post(this.n8nWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.wanApiKey}`
        }
      });

      // Store job in database
      await this.storeJob({
        id: response.data.jobId,
        userId: jobData.userId,
        status: 'pending',
        type: jobData.type,
        prompt: jobData.prompt,
        createdAt: new Date()
      });

      return {
        success: true,
        jobId: response.data.jobId,
        status: 'pending'
      };

    } catch (error) {
      console.error('Error creating job:', error);
      throw new Error(`Failed to create job: ${error.message}`);
    }
  }

  /**
   * Validate job data
   * @param {Object} jobData - Job data to validate
   */
  validateJobData(jobData) {
    const required = ['userId', 'prompt', 'platform', 'type'];
    
    for (const field of required) {
      if (!jobData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate platform
    const validPlatforms = ['instagram', 'twitter', 'linkedin', 'tiktok'];
    if (!validPlatforms.includes(jobData.platform)) {
      throw new Error(`Invalid platform: ${jobData.platform}`);
    }

    // Validate prompt length
    if (jobData.prompt.length > 1000) {
      throw new Error('Prompt too long (max 1000 characters)');
    }
  }

  /**
   * Get user credentials from database
   * @param {string} userId - User ID
   * @param {string} platform - Social media platform
   * @returns {Promise<Object>} User credentials
   */
  async getUserCredentials(userId, platform) {
    try {
      const credentials = await this.database.query(
        'SELECT access_token, refresh_token, expires_at FROM user_credentials WHERE user_id = ? AND provider = ?',
        [userId, platform]
      );

      if (!credentials || credentials.length === 0) {
        throw new Error(`No credentials found for user ${userId} on ${platform}`);
      }

      const cred = credentials[0];

      // Check if token is expired
      if (cred.expires_at && new Date(cred.expires_at) < new Date()) {
        // Refresh token logic here
        await this.refreshToken(userId, platform, cred.refresh_token);
        return await this.getUserCredentials(userId, platform);
      }

      return cred;

    } catch (error) {
      throw new Error(`Failed to get credentials: ${error.message}`);
    }
  }

  /**
   * Store job in database
   * @param {Object} jobData - Job data to store
   */
  async storeJob(jobData) {
    try {
      await this.database.query(
        'INSERT INTO jobs (id, user_id, status, type, prompt, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [jobData.id, jobData.userId, jobData.status, jobData.type, jobData.prompt, jobData.createdAt]
      );
    } catch (error) {
      throw new Error(`Failed to store job: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   * @param {string} userId - User ID
   * @param {string} platform - Social media platform
   * @param {string} refreshToken - Refresh token
   */
  async refreshToken(userId, platform, refreshToken) {
    // Implementation depends on platform
    // This is a placeholder for token refresh logic
    console.log(`Refreshing token for user ${userId} on ${platform}`);
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    try {
      const job = await this.database.query(
        'SELECT * FROM jobs WHERE id = ?',
        [jobId]
      );

      if (!job || job.length === 0) {
        throw new Error(`Job not found: ${jobId}`);
      }

      return job[0];

    } catch (error) {
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }
}

// Example usage
async function example() {
  const config = {
    n8nWebhookUrl: 'https://your-n8n.com/webhook/automation',
    wanApiKey: 'your-wan-api-key',
    database: {
      query: async (sql, params) => {
        // Database implementation
        console.log('Database query:', sql, params);
        return [];
      }
    }
  };

  const automation = new AutomationSetup(config);

  try {
    const job = await automation.createJob({
      userId: 'user123',
      prompt: 'Create a beautiful sunset landscape',
      platform: 'instagram',
      type: 'image_generation',
      caption: 'Beautiful AI-generated sunset! 🌅'
    });

    console.log('Job created:', job);

    // Check status
    const status = await automation.getJobStatus(job.jobId);
    console.log('Job status:', status);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for use in other modules
module.exports = AutomationSetup;

// Run example if this file is executed directly
if (require.main === module) {
  example();
}
