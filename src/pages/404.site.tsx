import SitePage from "../SitePage";
import { loadPage } from "../server/content";
export const getStaticProps = () => loadPage("not-found");
export default SitePage;
