import { createBrowserRouter, RouterProvider } from 'react-router'
import { Diary } from './routes/Diary'
import { Log } from './routes/Log'
import { Album } from './routes/Album'
import { Recs } from './routes/Recs'
import { Settings } from './routes/Settings'

const router = createBrowserRouter([
  { path: '/', element: <Diary /> },
  { path: '/log', element: <Log /> },
  { path: '/album/:id', element: <Album /> },
  { path: '/recs', element: <Recs /> },
  { path: '/settings', element: <Settings /> },
])

export function App() {
  return <RouterProvider router={router} />
}
