import { createBrowserRouter, RouterProvider } from 'react-router';
import Home from '@/routes/home';
import PllRecognitionTrainer from '@/routes/pll';
import CollRecognitionTrainer from '@/routes/coll';
import CrossTrainer from '@/routes/cross';
import ZbllTrainer from '@/routes/zbll';
import OllTrainer from '@/routes/oll';

const router = createBrowserRouter(
  [
    { path: '/', element: <Home /> },
    { path: '/trainers/recognition/pll', element: <PllRecognitionTrainer /> },
    { path: '/trainers/recognition/coll', element: <CollRecognitionTrainer /> },
    { path: '/trainers/cross', element: <CrossTrainer /> },
    { path: '/trainers/zbll', element: <ZbllTrainer /> },
    { path: '/trainers/oll', element: <OllTrainer /> },
    { path: '*', element: <Home /> },
  ],
  { basename: '/cubing-tools' },
);

export default function App() {
  return <RouterProvider router={router} />;
}
