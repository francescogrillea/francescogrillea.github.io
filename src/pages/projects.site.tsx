import SitePage from "../SitePage";
import { loadPage } from "../server/content";
export const getStaticProps = () => loadPage("projects");
export default SitePage;
