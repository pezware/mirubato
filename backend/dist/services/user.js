import { nanoid } from 'nanoid';
import { Instrument, Theme, NotationSize } from '../types/shared';
export class UserService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getUserById(id) {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(id)
            .first();
        if (!result) {
            return null;
        }
        // Get preferences
        const prefsResult = await this.db
            .prepare('SELECT preferences FROM user_preferences WHERE user_id = ?')
            .bind(id)
            .first();
        const preferences = prefsResult?.preferences
            ? JSON.parse(prefsResult.preferences)
            : this.getDefaultPreferences();
        return this.mapToUser(result, preferences);
    }
    async getUserByEmail(email) {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE email = ?')
            .bind(email)
            .first();
        if (!result) {
            return null;
        }
        // Get preferences
        const prefsResult = await this.db
            .prepare('SELECT preferences FROM user_preferences WHERE user_id = ?')
            .bind(result.id)
            .first();
        const preferences = prefsResult?.preferences
            ? JSON.parse(prefsResult.preferences)
            : this.getDefaultPreferences();
        return this.mapToUser(result, preferences);
    }
    async createUser(data) {
        const id = `user_${nanoid()}`;
        const now = new Date().toISOString();
        // Create user
        await this.db
            .prepare('INSERT INTO users (id, email, display_name, primary_instrument, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, data.email, data.displayName || null, 'PIANO', now, now)
            .run();
        // Create default preferences
        const preferences = this.getDefaultPreferences();
        await this.db
            .prepare('INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?)')
            .bind(id, JSON.stringify(preferences))
            .run();
        return {
            id,
            email: data.email,
            displayName: data.displayName,
            primaryInstrument: Instrument.PIANO,
            preferences,
            stats: this.getDefaultStats(),
            createdAt: now,
            updatedAt: now,
        };
    }
    async updateUser(id, input) {
        const user = await this.getUserById(id);
        if (!user) {
            throw new Error('User not found');
        }
        const updates = [];
        const values = [];
        if (input.displayName !== undefined) {
            updates.push('display_name = ?');
            values.push(input.displayName);
        }
        if (input.primaryInstrument !== undefined) {
            updates.push('primary_instrument = ?');
            values.push(input.primaryInstrument);
        }
        if (updates.length > 0) {
            updates.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);
            await this.db
                .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
                .bind(...values)
                .run();
        }
        // Update preferences if provided
        if (input.preferences) {
            const currentPrefs = user.preferences;
            const newPrefs = { ...currentPrefs, ...input.preferences };
            await this.db
                .prepare('UPDATE user_preferences SET preferences = ? WHERE user_id = ?')
                .bind(JSON.stringify(newPrefs), id)
                .run();
        }
        return this.getUserById(id);
    }
    async deleteUser(id) {
        // Foreign key constraints will cascade delete related records
        await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    }
    async getUserStats(userId) {
        // Calculate stats from practice sessions
        const statsResult = await this.db
            .prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(CAST(julianday(completed_at) - julianday(started_at) AS REAL) * 86400), 0) as total_time,
          COALESCE(AVG(accuracy_percentage), 0) as avg_accuracy
        FROM practice_sessions
        WHERE user_id = ? AND completed_at IS NOT NULL
      `)
            .bind(userId)
            .first();
        // Calculate consecutive days
        const daysResult = await this.db
            .prepare(`
        SELECT DISTINCT DATE(started_at) as practice_date
        FROM practice_sessions
        WHERE user_id = ?
        ORDER BY practice_date DESC
      `)
            .bind(userId)
            .all();
        const consecutiveDays = this.calculateConsecutiveDays(daysResult.results.map(r => r.practice_date));
        return {
            totalPracticeTime: Math.floor(statsResult?.total_time || 0),
            consecutiveDays,
            piecesCompleted: 0, // TODO: Implement when we have sheet music completion tracking
            accuracyAverage: Math.round((statsResult?.avg_accuracy || 0) * 100) / 100,
        };
    }
    mapToUser(dbRow, preferences) {
        return {
            id: dbRow.id,
            email: dbRow.email,
            displayName: dbRow.display_name,
            primaryInstrument: dbRow.primary_instrument,
            preferences,
            stats: this.getDefaultStats(), // Stats are loaded separately
            createdAt: dbRow.created_at,
            updatedAt: dbRow.updated_at,
        };
    }
    getDefaultPreferences() {
        return {
            theme: Theme.LIGHT,
            notationSize: NotationSize.MEDIUM,
            practiceReminders: true,
            dailyGoalMinutes: 30,
        };
    }
    getDefaultStats() {
        return {
            totalPracticeTime: 0,
            consecutiveDays: 0,
            piecesCompleted: 0,
            accuracyAverage: 0,
        };
    }
    calculateConsecutiveDays(dates) {
        if (dates.length === 0)
            return 0;
        let consecutive = 1;
        const today = new Date().toISOString().split('T')[0];
        // Check if practiced today
        if (dates[0] !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (dates[0] !== yesterday.toISOString().split('T')[0]) {
                return 0;
            }
        }
        for (let i = 1; i < dates.length; i++) {
            const current = new Date(dates[i - 1]);
            const previous = new Date(dates[i]);
            const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                consecutive++;
            }
            else {
                break;
            }
        }
        return consecutive;
    }
}
//# sourceMappingURL=user.js.map