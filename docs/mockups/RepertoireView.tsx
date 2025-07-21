// Mock UI Component for Repertoire View
// This shows how the transformed Pieces tab would look with repertoire features

import React from 'react'
import { Card, Button, Select, Input } from '@/components/ui'
import { Clock, Target, TrendingUp, Music, Calendar } from 'lucide-react'

const RepertoireView = () => {
  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-stone-800">My Repertoire</h2>
        <Button variant="primary">
          <Music className="w-4 h-4 mr-2" />
          Add to Repertoire
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-4">
        <Select value="all" onChange={() => {}} className="w-40">
          <option value="all">All Pieces</option>
          <option value="working">Working</option>
          <option value="polished">Polished</option>
          <option value="performance">Performance Ready</option>
          <option value="planned">Planned</option>
        </Select>

        <Select value="active" onChange={() => {}} className="w-40">
          <option value="all">All Goals</option>
          <option value="active">Active Goals</option>
          <option value="completed">Completed</option>
          <option value="no-goals">No Goals</option>
        </Select>

        <Input placeholder="Search pieces..." className="flex-1 max-w-xs" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4">
          <div className="text-sm text-stone-600">Total Repertoire</div>
          <div className="text-2xl font-bold text-sage-700">24 pieces</div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="text-sm text-stone-600">Active Goals</div>
          <div className="text-2xl font-bold text-blue-600">5 goals</div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="text-sm text-stone-600">Practice This Week</div>
          <div className="text-2xl font-bold text-green-600">12.5 hours</div>
        </Card>
        <Card variant="elevated" className="p-4">
          <div className="text-sm text-stone-600">Performance Ready</div>
          <div className="text-2xl font-bold text-purple-600">3 pieces</div>
        </Card>
      </div>

      {/* Repertoire Items */}
      <div className="space-y-4">
        {/* Performance Ready Piece */}
        <Card variant="elevated" className="p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800">
                    Chopin - Nocturne Op.9 No.2
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-stone-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      42h total
                    </span>
                    <span>Last practiced: 2 days ago</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Performance Ready
                </span>
              </div>

              {/* Active Goal */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <Target className="w-4 h-4" />
                    Goal: Polish dynamics and rubato by Aug 1
                  </span>
                  <span className="text-sm text-blue-600">80%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '80%' }}
                  ></div>
                </div>
                <div className="mt-2 text-sm text-blue-700">
                  Next: Work on dynamics in measures 17-24
                </div>
              </div>

              {/* Personal Notes Preview */}
              <div className="mt-3 text-sm text-stone-600 italic">
                "Focus on the left hand melody in the middle section. Reference:
                Rubinstein's 1965 recording..."
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex lg:flex-col gap-2">
              <Button variant="ghost" size="sm">
                View Score
              </Button>
              <Button variant="ghost" size="sm">
                Practice Log
              </Button>
              <Button variant="ghost" size="sm">
                Edit Notes
              </Button>
            </div>
          </div>
        </Card>

        {/* Working Piece with Active Practice */}
        <Card variant="elevated" className="p-6 border-l-4 border-orange-500">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800">
                    Bach - Invention No.1 in C Major
                    <span className="ml-2 text-orange-500">🔥</span>
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-stone-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      18h total
                    </span>
                    <span className="text-green-600 font-medium">
                      Practiced today (45 min)
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  Working
                </span>
              </div>

              {/* Goal with Milestones */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <Target className="w-4 h-4" />
                    Goal: Memorize and perform by Sept 15
                  </span>
                  <span className="text-sm text-blue-600">40%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '40%' }}
                  ></div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-stone-600">
                    ✓ Learn notes (100%)
                  </div>
                  <div className="text-sm text-blue-700 font-medium">
                    → Work on hand independence m.8-12 (60%)
                  </div>
                  <div className="text-sm text-stone-500">○ Memorize (0%)</div>
                </div>
              </div>

              {/* Measure-specific annotations */}
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                  📌 m.8-12: Focus section
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                  ⚠️ m.15: Difficult passage
                </span>
              </div>
            </div>

            <div className="flex lg:flex-col gap-2">
              <Button variant="primary" size="sm">
                Continue Practice
              </Button>
              <Button variant="ghost" size="sm">
                View Annotations
              </Button>
              <Button variant="ghost" size="sm">
                Update Goal
              </Button>
            </div>
          </div>
        </Card>

        {/* Learning/Planned Piece */}
        <Card variant="elevated" className="p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800">
                    Mozart - Sonata K.331, 1st Movement
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-stone-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      5h total
                    </span>
                    <span className="text-amber-600">
                      Last practiced: 1 week ago
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Learning
                </span>
              </div>

              {/* Goal */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <Target className="w-4 h-4" />
                    Goal: Learn exposition section
                  </span>
                  <span className="text-sm text-blue-600">20%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '20%' }}
                  ></div>
                </div>
                <div className="mt-2 text-sm text-blue-700">
                  TODO: Practice A major scales and arpeggios for preparation
                </div>
              </div>

              {/* Difficulty Rating */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-stone-600">Difficulty:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span
                      key={i}
                      className={i <= 3 ? 'text-yellow-500' : 'text-stone-300'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-stone-500 ml-2">
                  Intermediate
                </span>
              </div>
            </div>

            <div className="flex lg:flex-col gap-2">
              <Button variant="secondary" size="sm">
                Start Practice
              </Button>
              <Button variant="ghost" size="sm">
                View Score
              </Button>
              <Button variant="ghost" size="sm">
                Set Goal
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default RepertoireView
