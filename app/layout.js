import "./globals.css";
export const metadata = { title: "Tweet Saver", description: "Save tweets as images and videos" };
export default function Root({ children }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>{children}</body></html>);
}
