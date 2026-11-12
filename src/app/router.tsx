import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import {
  createHashRouter,
  Outlet,
  type RouteObject,
  useHref,
  useNavigate,
} from "react-router";
import { HomePage } from "../frame/home/HomePage";
import { NotFoundPage } from "../frame/home/NotFoundPage";
import { Footer } from "../frame/layout/Footer";
import { Header } from "../frame/layout/Header";
import { PageLayout } from "../frame/layout/PageLayout";
import { PageFocusProvider } from "../frame/ui/PageHeading";
import { features } from "./features";

function RootRoute() {
  const navigate = useNavigate();

  return (
    <AriaRouterProvider navigate={(to) => navigate(to)} useHref={useHref}>
      <PageFocusProvider>
        <PageLayout header={<Header />} footer={<Footer />}>
          <Outlet />
        </PageLayout>
      </PageFocusProvider>
    </AriaRouterProvider>
  );
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootRoute />,
    children: [
      { index: true, element: <HomePage /> },
      ...features.flatMap((feature) => feature.routes),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createHashRouter(routes);
