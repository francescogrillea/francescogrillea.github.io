import SitePage from "../SitePage";
import { loadPage } from "../server/content";
export const getStaticProps = () => loadPage("overview");
export default SitePage;
