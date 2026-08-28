import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/admin/gestion", destination: "/backoffice/gestion", permanent: false },
      { source: "/admin/ordenes", destination: "/backoffice/ordenes", permanent: false },
      { source: "/admin/ordenes/:path*", destination: "/backoffice/ordenes/:path*", permanent: false },
      { source: "/admin/facturacion", destination: "/backoffice/facturacion", permanent: false },
      { source: "/admin/facturacion/:path*", destination: "/backoffice/facturacion/:path*", permanent: false },
      { source: "/admin/clientes", destination: "/backoffice/clientes", permanent: false },
      { source: "/admin/gastos", destination: "/backoffice/gastos", permanent: false },
      { source: "/admin/informe", destination: "/backoffice/informe", permanent: false },
      { source: "/admin/config", destination: "/backoffice", permanent: false },
      { source: "/admin/config/:path*", destination: "/backoffice/config/:path*", permanent: false },
      { source: "/admin/administracion", destination: "/backoffice", permanent: false },
      {
        source: "/admin/administracion/proveedores",
        destination: "/backoffice/proveedores",
        permanent: false,
      },
      { source: "/admin/metricas", destination: "/admin", permanent: false },
    ];
  },
  transpilePackages: ["leaflet", "react-leaflet"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/**" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net", pathname: "/**" },
      { protocol: "https", hostname: "dalleprodsec.blob.core.windows.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
