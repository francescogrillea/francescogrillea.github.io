import SitePage from "../SitePage";
import { loadPage } from "../server/content";
export const getStaticProps = () => loadPage("research");
export default SitePage;
