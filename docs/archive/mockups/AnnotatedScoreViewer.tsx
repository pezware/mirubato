// Mock UI Component for Annotated Score Viewer
// Shows how PDF annotation and measure selection would work

import React from 'react'
import { Button, Card } from '@/components/ui'
import {
  Pencil,
  Highlighter,
  Type,
  Square,
  Eraser,
  Save,
  Undo,
  Redo,
  Download,
  Music,
  Target,
  Clock,
  MessageSquare,
} from 'lucide-react'

const AnnotatedScoreViewer = () => {
  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Header with Score Info and Practice Status */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-stone-800">
              Bach - Invention No.1 in C Major
            </h3>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
              Working
            </span>
            {/* Active Practice Timer */}
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">15:32</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Target className="w-4 h-4 mr-2" />
              View Goals
            </Button>
            <Button variant="primary" size="sm">
              Stop Practice
            </Button>
          </div>
        </div>
      </div>

      {/* Annotation Toolbar */}
      <div className="bg-white border-b border-stone-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Drawing Tools */}
            <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className="bg-sage-100 text-sage-700"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Highlighter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Type className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Square className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            {/* Color Selector */}
            <div className="flex items-center gap-1 ml-2">
              <div className="w-6 h-6 bg-red-500 rounded-full cursor-pointer border-2 border-stone-800"></div>
              <div className="w-6 h-6 bg-blue-500 rounded-full cursor-pointer"></div>
              <div className="w-6 h-6 bg-green-500 rounded-full cursor-pointer"></div>
              <div className="w-6 h-6 bg-yellow-400 rounded-full cursor-pointer"></div>
              <div className="w-6 h-6 bg-purple-500 rounded-full cursor-pointer"></div>
            </div>

            <div className="h-6 w-px bg-stone-300 mx-2"></div>

            {/* Actions */}
            <Button variant="ghost" size="sm">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="primary" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer with Annotations */}
        <div className="flex-1 bg-stone-100 p-4 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* PDF Page Container */}
            <div className="bg-white shadow-lg relative">
              {/* Mock PDF Page */}
              <img
                src="/api/placeholder/800/1100"
                alt="Sheet music"
                className="w-full"
              />

              {/* Annotation Overlay Examples */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Red circle around difficult passage */}
                <ellipse
                  cx="400"
                  cy="300"
                  rx="180"
                  ry="60"
                  fill="none"
                  stroke="red"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />

                {/* Yellow highlight over measures */}
                <rect
                  x="150"
                  y="450"
                  width="500"
                  height="80"
                  fill="yellow"
                  opacity="0.3"
                />

                {/* Practice bracket for measures 8-12 */}
                <path
                  d="M 100 600 L 100 580 L 700 580 L 700 600"
                  stroke="blue"
                  strokeWidth="3"
                  fill="none"
                />
                <text
                  x="400"
                  y="575"
                  textAnchor="middle"
                  fill="blue"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Focus: Hand Independence (m.8-12)
                </text>

                {/* Fingering annotations */}
                <text
                  x="250"
                  y="420"
                  fill="purple"
                  fontSize="12"
                  fontWeight="bold"
                >
                  3
                </text>
                <text
                  x="270"
                  y="420"
                  fill="purple"
                  fontSize="12"
                  fontWeight="bold"
                >
                  2
                </text>
                <text
                  x="290"
                  y="420"
                  fill="purple"
                  fontSize="12"
                  fontWeight="bold"
                >
                  1
                </text>
              </svg>

              {/* Text Note Annotation */}
              <div className="absolute top-20 right-4 w-48 p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-1">
                  <MessageSquare className="w-4 h-4 text-yellow-600" />
                  <button className="text-stone-400 hover:text-stone-600">
                    ×
                  </button>
                </div>
                <p className="text-sm text-stone-700">
                  Watch the tempo here! Should feel like flowing water, not
                  rushed.
                </p>
                <p className="text-xs text-stone-500 mt-2">Added 3 days ago</p>
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex justify-center items-center gap-4 mt-4">
              <Button variant="ghost" size="sm">
                Previous
              </Button>
              <span className="text-sm text-stone-600">Page 2 of 4</span>
              <Button variant="ghost" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel - Measure Practice List */}
        <div className="w-80 bg-white border-l border-stone-200 p-4 overflow-auto">
          <h4 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Today's Practice Focus
          </h4>

          <div className="space-y-3">
            {/* Measure Section 1 */}
            <Card variant="bordered" className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium text-stone-700">Measures 1-4</h5>
                  <p className="text-sm text-stone-500">Opening theme</p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                  ✓ Done
                </span>
              </div>
              <div className="text-sm text-stone-600">
                Practice time today: 8 min
              </div>
            </Card>

            {/* Measure Section 2 - Active */}
            <Card variant="bordered" className="p-3 border-blue-500 bg-blue-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium text-blue-700">Measures 8-12</h5>
                  <p className="text-sm text-blue-600">
                    Hand independence section
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  In Progress
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-stone-600">
                  Practice time today: 15 min
                </div>
                <div className="text-sm text-blue-700">
                  Goal: Clean execution at 120 BPM
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '60%' }}
                  ></div>
                </div>
              </div>
            </Card>

            {/* Measure Section 3 */}
            <Card variant="bordered" className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium text-stone-700">Measures 15-16</h5>
                  <p className="text-sm text-red-600">Difficult passage</p>
                </div>
                <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded">
                  TODO
                </span>
              </div>
              <div className="text-sm text-stone-600">
                Notes: Slow practice with hands separate
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 space-y-2">
            <Button variant="secondary" className="w-full">
              <Music className="w-4 h-4 mr-2" />
              Add Measure Section
            </Button>
            <Button variant="ghost" className="w-full">
              Generate Practice Plan
            </Button>
          </div>

          {/* Practice Stats */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h4 className="font-semibold text-stone-800 mb-3">Session Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Total Practice Time</span>
                <span className="font-medium">15:32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Measures Worked</span>
                <span className="font-medium">3 sections</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Annotations Added</span>
                <span className="font-medium">4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnnotatedScoreViewer
