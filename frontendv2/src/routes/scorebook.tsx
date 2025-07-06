import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

// Lazy load the Scorebook components
const ScorebookPage = lazy(() => import('../pages/Scorebook'))
const ScoreBrowser = lazy(() => import('../pages/ScoreBrowser'))
const CollectionView = lazy(() => import('../pages/CollectionView'))

export const scorebookRoutes: RouteObject[] = [
  {
    path: '/scorebook',
    children: [
      {
        path: '',
        element: <ScoreBrowser />,
      },
      {
        path: 'browse',
        element: <ScoreBrowser />,
      },
      {
        path: 'collection/:slug',
        element: <CollectionView />,
      },
      {
        path: 'collection/user/:id',
        element: <CollectionView />,
      },
      {
        path: ':scoreId',
        element: <ScorebookPage />,
      },
    ],
  },
]
