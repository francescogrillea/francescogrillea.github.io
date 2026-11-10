import SitePage from "../SitePage";
import { loadPage } from "../server/content";
export const getStaticProps = () => loadPage("education");
export default SitePage;
