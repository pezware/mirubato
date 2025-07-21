// Mock UI Component for Create Goal Modal
// Shows how users would create goals for repertoire pieces

import React from 'react'
import { Modal, Button, Input, Textarea, Select, Card } from '@/components/ui'
import { Target, Calendar, Clock, Music, Zap, TrendingUp } from 'lucide-react'

const CreateGoalModal = () => {
  return (
    <Modal
      isOpen={true}
      onClose={() => {}}
      title="Create Repertoire Goal"
      size="large"
    >
      <div className="space-y-6">
        {/* Piece Selection */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Select Piece
          </label>
          <Select className="w-full">
            <option>Bach - Invention No.1 in C Major</option>
            <option>Chopin - Nocturne Op.9 No.2</option>
            <option>Mozart - Sonata K.331, 1st Movement</option>
          </Select>
        </div>

        {/* Goal Templates */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Goal Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Card
              variant="bordered"
              className="p-4 cursor-pointer hover:border-sage-500 border-2 border-sage-500 bg-sage-50"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-sage-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-sage-600" />
                </div>
                <div>
                  <h4 className="font-medium text-stone-800">
                    Performance Ready
                  </h4>
                  <p className="text-sm text-stone-600 mt-1">
                    Master piece for public performance
                  </p>
                </div>
              </div>
            </Card>

            <Card
              variant="bordered"
              className="p-4 cursor-pointer hover:border-sage-500"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <Music className="w-5 h-5 text-stone-600" />
                </div>
                <div>
                  <h4 className="font-medium text-stone-800">
                    Learn & Memorize
                  </h4>
                  <p className="text-sm text-stone-600 mt-1">
                    Learn notes and memorize piece
                  </p>
                </div>
              </div>
            </Card>

            <Card
              variant="bordered"
              className="p-4 cursor-pointer hover:border-sage-500"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <Zap className="w-5 h-5 text-stone-600" />
                </div>
                <div>
                  <h4 className="font-medium text-stone-800">
                    Technical Mastery
                  </h4>
                  <p className="text-sm text-stone-600 mt-1">
                    Focus on specific technical challenges
                  </p>
                </div>
              </div>
            </Card>

            <Card
              variant="bordered"
              className="p-4 cursor-pointer hover:border-sage-500"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <Target className="w-5 h-5 text-stone-600" />
                </div>
                <div>
                  <h4 className="font-medium text-stone-800">Custom Goal</h4>
                  <p className="text-sm text-stone-600 mt-1">
                    Create your own specific goal
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Goal Details */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Goal Title
          </label>
          <Input
            value="Master Bach Invention for Spring Recital"
            className="w-full"
          />
        </div>

        {/* Milestones */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Milestones
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked className="rounded" />
              <Input
                value="Learn all notes (hands separate)"
                className="flex-1"
              />
              <Input type="date" value="2025-08-01" className="w-32" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <Input
                value="Play hands together at slow tempo"
                className="flex-1"
              />
              <Input type="date" value="2025-08-15" className="w-32" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <Input value="Reach target tempo (120 BPM)" className="flex-1" />
              <Input type="date" value="2025-09-01" className="w-32" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <Input value="Memorize completely" className="flex-1" />
              <Input type="date" value="2025-09-15" className="w-32" />
            </div>
            <Button variant="ghost" size="sm" className="mt-2">
              + Add Milestone
            </Button>
          </div>
        </div>

        {/* Time Commitment */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Target Date
            </label>
            <Input type="date" value="2025-10-15" className="w-full" />
            <p className="text-xs text-stone-500 mt-1">
              Optional - leave empty for open-ended goal
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Daily Practice Time
            </label>
            <Select className="w-full">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>1 hour</option>
              <option>No specific requirement</option>
            </Select>
          </div>
        </div>

        {/* Specific Measures */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Focus Measures (Optional)
          </label>
          <Input placeholder="e.g., 8-12, 15-16, 24-32" className="w-full" />
          <p className="text-xs text-stone-500 mt-1">
            Specify measure numbers that need special attention
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Practice Notes
          </label>
          <Textarea
            rows={3}
            placeholder="Add any specific practice instructions, reference recordings, or personal notes..."
            className="w-full"
          />
        </div>

        {/* Smart Suggestions */}
        <Card variant="bordered" className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Smart Suggestions
          </h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>
              • Based on your practice history, 30 min/day would help you reach
              this goal
            </li>
            <li>• Similar pieces took you an average of 6 weeks to master</li>
            <li>• Consider adding scales in C Major to your warm-up routine</li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost">Cancel</Button>
          <Button variant="secondary">Save as Draft</Button>
          <Button variant="primary">
            <Target className="w-4 h-4 mr-2" />
            Create Goal
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateGoalModal
