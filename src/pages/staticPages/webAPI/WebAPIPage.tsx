import * as React from 'react';
import {observer} from 'mobx-react';
import {observable} from "mobx";
import {PageLayout} from "../../../shared/components/PageLayout/PageLayout";
import StaticContent from "../../../shared/components/staticContent/StaticContent";
import internalClient from "shared/api/cbioportalInternalClientInstance";
import './styles.scss';
import Helmet from "react-helmet";
import { Link } from 'react-router';
import AppConfig from "appConfig";
import {isNullOrUndefined} from "util";
import fileDownload from 'react-file-download';
import {AppStore} from "../../../AppStore";
import LoadingIndicator from "../../../shared/components/loadingIndicator/LoadingIndicator";
import getBrowserWindow from "../../../public-lib/lib/getBrowserWindow";

export class UserDataAccessToken {
    @observable token : string;
    @observable creationDate: string;
    @observable expirationDate: string;
    @observable username: string;
    constructor(token: string, creationDate: string, expirationDate: string, username: string) {
        this.token = token;
        this.creationDate = creationDate;
        this.expirationDate = expirationDate;
        this.username = username;
    }
}

function buildDataAccessTokenFileContents(dat:UserDataAccessToken | undefined) {
    if (!isNullOrUndefined(dat)) {
        var token = dat!.token;
        var creation_date = new Date(dat!.creationDate).toISOString();
        var expiration_date = new Date(dat!.expirationDate).toISOString();
        return `token: ${token}\ncreation_date: ${creation_date}\nexpiration_date: ${expiration_date}\n`;
    } else {
        alert("Cannot create Data Access Token file for user with non-existent tokens.");
        return null;
    }
}

@observer
export default class WebAPIPage extends React.Component<{}, {}> {
    private get appStore(){
        return getBrowserWindow().globalStores.appStore;
    }

    async generateNewDataAccessToken() {
        if (this.appStore.isLoggedIn) {
            let _token = await internalClient.createDataAccessTokenUsingPOST(
                    {'allowRevocationOfOtherTokens':AppConfig.serverConfig.dat_uuid_revoke_other_tokens});
            const dat = new UserDataAccessToken(_token.token, _token.creation, _token.expiration, _token.username);
            return dat;
        } else {
            return undefined;
        }
    }

    async downloadDataAccessTokenFile() {
        const dat = this.generateNewDataAccessToken();
        if (!isNullOrUndefined(dat)) {
            const fileContents = buildDataAccessTokenFileContents(await dat);
            fileDownload(fileContents, "cbioportal_data_access_token.txt");
        }
    }

    renderDataAccessTokensDiv() {
        if ((AppConfig.serverConfig.authenticationMethod === "social_auth" || (AppConfig.serverConfig.dat_method !== "uuid" && AppConfig.serverConfig.dat_method !== "jwt"))) {
            return <div></div>;
        }
        else {
            return (
                <div id="using-data-access-tokens">
                    <p>To directly access the cBioPortal web services on installations which require login,
                        clients will need to obtain a data access token and present this token with each web service request.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => this.downloadDataAccessTokenFile()}>Download Token</button>
                    <p>There are instructions for making requests to the Web API using Data Access Tokens&nbsp;
                        <a href="https://docs.cbioportal.org/2.2-authorization-and-authentication/authenticating-users-via-tokens#using-data-access-tokens">here</a></p>
                </div>
            );
        }
    }

    public render() {

        return <PageLayout className={'whiteBackground staticPage'}>
            <Helmet>
                <title>{'cBioPortal for Cancer Genomics::Helmet'}</title>
            </Helmet>

            <h1>Web API</h1>

            <h2 id="introduction">Introduction</h2>
            <p>The Cancer Genomic Data Server (CGDS) web service interface provides direct programmatic access to all
                genomic data stored within the server. This enables you to easily access data from your favorite
                programming language, such as Python, Java, Perl, R or MatLab. The CGDS web service is REST-based,
                meaning that client applications create a query consisting of parameters appended to a URL, and receive
                back either either text or an XML response. For CGDS, all responses are currently tab-delimited text.
                Clients of the CGDS web service can issue the following types of queries:</p>
            <ul>
                <li>What cancer studies are stored on the server?</li>
                <li>What genetic profile types are available for cancer study X? For example, does the server store
                    mutation and copy number data for the TCGA Glioblastoma data?
                </li>
                <li>What case sets are available for cancer study X? For example, what case sets are available for TCGA
                    Glioblastoma?
                </li>
            </ul>
            <p>Additionally, clients can easily retrieve "slices" of genomic data. For example, a client can retrieve
                all mutation data from PTEN and EGFR in the TCGA Glioblastoma data.</p>
            <p>Please note that the example queries below are accurate, but they are not guaranteed to return data, as
                our database is constantly being updated.</p>
            {this.renderDataAccessTokensDiv()}
            <h2 id="the-cgds-r-package">The CGDS R Package</h2>
            <p>If you are interested in accessing CGDS via R, please check out our <Link to={"/rmatlab"}> CGDS-R
                library</Link>.</p>
            <h2 id="basic-query-syntax">Basic Query Syntax</h2>
            <p>All web queries are available at: <a href="webservice.do">webservice.do</a>. All calls to the Web
                interface are constructed by appending URL parameters. Within each call, you must specify:</p>
            <ul>
                <li><strong>cmd</strong> = the command that you wish to execute. The command must be equal to one of the
                    following: getTypesOfCancer, getNetwork, getCancerStudies, getGeneticProfiles, getProfileData,
                    getCaseLists, getClinicalData, or getMutationData.
                </li>
                <li>optional additional parameters, depending of the command (see below).</li>
            </ul>
            <p>For example, the following query will request all case lists for the TCGA GBM data:</p>
            <p><a
                href="webservice.do?cmd=getCaseLists&amp;cancer_study_id=gbm_tcga">webservice.do?cmd=getCaseLists&amp;cancer_study_id=gbm_tcga</a>
            </p>
            <h2 id="response-header-and-error-messages">Response Header and Error Messages</h2>
            <p>The first line of each response begins with a hash mark (#), and will contain data regarding the server
                status. For example:</p>
            <pre><code>
# CGDS Kernel:  Data served up fresh at:  Wed Oct 27 13:02:30 EDT 2010
</code></pre>
            <p>If any errors have occurred in processing your query, this will appear directly after the status message.
                Error messages begin with the "Error:" tag. Warning messages begin with the "# Warning:" tag.
                Unrecoverable errors are reported as errors. For example:</p>
            <pre><code>
# CGDS Kernel:  Data served up fresh at:  Wed Oct 27 13:02:30 EDT 2010<br />
Error:  No case lists available for cancer_study_id:  gbs.
</code></pre>
            <p>Recoverable errors, such as invalid gene symbols are reported as warnings. Multiple warnings may also be
                returned. For example:</p>
            <pre><code>
# CGDS Kernel:  Data served up fresh at:  Wed Oct 27 13:06:34 EDT 2010<br />
# Warning:  Unknown gene:  EGFR11<br />
# Warning:  Unknown gene:  EGFR12<br />
</code></pre>
            <h2 id="deprecated-api">Deprecated API</h2>
            <p>As of August, 2011:</p>
            <ul>
                <li>
                    <p>In previous versions of the API, the <strong>getCancerStudies</strong> command was referred to
                        as <strong>getCancerTypes</strong>. For backward
                        compatibility, <strong>getCancerTypes</strong> still works, but is now considered deprecated.
                    </p>
                </li>
                <li>
                    <p>In previous versions of the API, the <strong>cancer_study_id</strong> parameter was referred to
                        as <strong>cancer_type_id</strong>. For backward
                        compatibility,, <strong>cancer_type_id</strong> still works, but is now considered deprecated.
                    </p>
                </li>
            </ul>

            <h2 id="commands">Commands</h2>
            <div className="commandDocumentation">
                <table className="table table-bordered">
                    <tbody>
                    <tr>
                        <th colSpan={2}>Get All Types of Cancer</th>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>Retrieves a list of all the clinical types of cancer stored on the server.</td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td><strong>cmd=getTypesOfCancer</strong> (required)</td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>A tab-delimited file with two columns:</p>
                            <ul>
                                <li><strong>type_of_cancer_id:</strong> a unique text identifier used to identify the
                                    type of cancer. For example, "gbm" identifies Glioblastoma multiforme.
                                </li>
                                <li><strong>name:</strong> short name of the type of cancer.</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td><a href="webservice.do?cmd=getTypesOfCancer">Get all Types of Cancer.</a></td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">
                    <tbody>
                    <tr>
                        <th colSpan={2}>Get All Cancer Studies</th>
                    </tr>

                    <tr>
                        <td>Description</td>
                        <td>Retrieves meta-data regarding cancer studies stored on the server.</td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td><strong>cmd=getCancerStudies</strong> (required)</td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>A tab-delimited file with three columns:</p>
                            <ul>
                                <li><strong>cancer_study_id:</strong> a unique ID that should be used to identify the
                                    cancer study in subsequent interface calls.
                                </li>
                                <li><strong>name:</strong> short name of the cancer study.</li>
                                <li><strong>description:</strong> short description of the cancer study.</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td><a href="webservice.do?cmd=getCancerStudies">Get all Cancer Studies.</a></td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">

                    <tbody>
                    <tr>
                        <th colSpan={2}>Get All Genetic Profiles for a Specific Cancer Study</th>
                    </tr>

                    <tr>
                        <td>Description</td>
                        <td>Retrieves meta-data regarding all genetic profiles, e.g. mutation or copy number profiles,
                            stored about a specific cancer study.
                        </td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getGeneticProfiles (required)</li>
                                <li><strong>cancer_study_id</strong>=[cancer study ID] (required)</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td>
                            <p>A tab-delimited file with six columns:</p>
                            <ul>
                                <li><strong>genetic_profile_id</strong>: a unique ID used to identify the genetic
                                    profile ID in subsequent interface calls. This is a human readable ID. For example,
                                    "gbm_mutations" identifies the TCGA GBM mutation genetic profile.
                                </li>
                                <li><strong>genetic_profile_name</strong>: short profile name.</li>
                                <li><strong>genetic_profile_description</strong>: short profile description.</li>
                                <li><strong>cancer_study_id</strong>: cancer study ID tied to this genetic profile. Will
                                    match the input cancer_study_id.
                                </li>
                                <li><strong>genetic_alteration_type</strong>: indicates the profile type. Will be one
                                    of:
                                    <ul>
                                        <li>MUTATION</li>
                                        <li>MUTATION_EXTENDED</li>
                                        <li>COPY_NUMBER_ALTERATION</li>
                                        <li>MRNA_EXPRESSION</li>
                                        <li>METHYLATION</li>
                                    </ul>
                                </li>
                                <li><strong>show_profile_in_analysis_tab</strong>: a boolean flag used for internal
                                    purposes (you can safely ignore it).
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td><a href="webservice.do?cmd=getGeneticProfiles&amp;cancer_study_id=gbm_tcga">Get all Genetic
                            Profiles for Glioblastoma (TCGA).</a></td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">

                    <tbody>
                    <tr>
                        <th colSpan={2}>Get All Case Lists for a Specific Cancer Study</th>
                    </tr>

                    <tr>
                        <td>Description</td>
                        <td>Retrieves meta-data regarding all case lists stored about a specific cancer study. For
                            example, a within a particular study, only some cases may have sequence data, and another
                            subset of cases may have been sequenced and treated with a specific therapeutic protocol.
                            Multiple case lists may be associated with each cancer study, and this method enables you to
                            retrieve meta-data regarding all of these case lists.
                        </td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getCaseLists (required)</li>
                                <li><strong>cancer_study_id</strong>=[cancer study ID] (required)</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>A tab-delimited file with five columns:</p>
                            <ul>
                                <li><strong>case_list_id</strong>: a unique ID used to identify the case list ID in
                                    subsequent interface calls. This is a human readable ID. For example, "gbm_all"
                                    identifies all cases profiles in the TCGA GBM study.
                                </li>
                                <li><strong>case_list_name</strong>: short name for the case list.</li>
                                <li><strong>case_list_description</strong>: short description of the case list.</li>
                                <li><strong>cancer_study_id</strong>: cancer study ID tied to this genetic profile. Will
                                    match the input cancer_study_id.
                                </li>
                                <li><strong>case_ids</strong>: space delimited list of all case IDs that make up this
                                    case list.
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td><a href="webservice.do?cmd=getCaseLists&amp;cancer_study_id=gbm_tcga">Get all Case Lists for
                            Glioblastoma (TCGA).</a></td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">


                    <tbody>
                    <tr>
                        <th colSpan={2}>Get Profile Data</th>
                    </tr>


                    <tr>
                        <td>Description</td>
                        <td>Retrieves genomic profile data for one or more genes.</td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getProfileData (required)</li>
                                <li><strong>case_set_id</strong>= [case set ID] (required)</li>
                                <li><strong>genetic_profile_id</strong>= [one or more genetic profile IDs] (required).
                                    Multiple genetic profile IDs must be separated by comma (,) characters, or URL
                                    encoded spaces, e.g. +
                                </li>
                                <li><strong>gene_list</strong>= [one or more genes, specified as HUGO Gene Symbols or
                                    Entrez Gene IDs] (required). Multiple genes must be separated by comma (,)
                                    characters, or URL encoded spaces, e.g. +
                                </li>
                            </ul>
                            <p>You can either:</p>
                            <ul>
                                <li><a
                                    href="webservice.do?cmd=getProfileData&amp;case_set_id=gbm_tcga_all&amp;genetic_profile_id=gbm_tcga_mutations&amp;gene_list=BRCA1+BRCA2+TP53">Specify
                                    multiple genes and a single genetic profile ID.</a></li>
                                <li><a
                                    href="webservice.do?cmd=getProfileData&amp;case_set_id=gbm_tcga_all&amp;genetic_profile_id=gbm_tcga_log2CNA,gbm_tcga_gistic&amp;gene_list=EGFR">Specify
                                    a single gene and multiple genetic profile IDs.</a></li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>When requesting one or multiple genes and a single genetic profile ID (see above), you
                            will receive a tab-delimited matrix with the following columns:</p>
                            <ol>
                                <li><strong>GENE_ID</strong>: Entrez Gene ID</li>
                                <li><strong>COMMON</strong>: HUGO Gene Symbol</li>
                                <li><strong>Columns 3 - N</strong>: Data for each case</li>
                            </ol>
                            <h4 id="response-format-2">Response Format 2</h4>
                            <p>When requesting a single gene and multiple genetic profile IDs (see above), you will
                                receive a tab-delimited matrix with the following columns:</p>
                            <ol>
                                <li><strong>GENETIC_PROFILE_ID</strong>: The Genetic Profile ID.</li>
                                <li><strong>ALTERATION_TYPE</strong>: The Genetic Alteration Type, e.g. MUTATION,
                                    MUTATION_EXTENDED, COPY_NUMBER_ALTERATION, or MRNA_EXPRESSION.
                                </li>
                                <li><strong>GENE_ID</strong>: Entrez Gene ID.</li>
                                <li><strong>COMMON</strong>: HUGO Gene Symbol.</li>
                                <li><strong>Columns 5 - N</strong>: Data for each case.</li>
                            </ol>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td>See Query Format above.</td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">

                    <tbody>
                    <tr>
                        <th colSpan={2}>Get Extended Mutation Data</th>
                    </tr>


                    <tr>
                        <td>Description</td>
                        <td>For data of type EXTENDED_MUTATION, you can request the full set of annotated extended
                            mutation data.
                            This enables you to, for example, determine which sequencing center sequenced the mutation,
                            the
                            amino acid change that results from the mutation, or gather links to predicted functional
                            consequences of the
                            mutation.
                        </td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getMutationData (required)</li>
                                <li><strong>genetic_profile_id</strong>= [one or more mutation profile IDs] (required).
                                    Multiple genetic profile IDs must be separated by comma (,) characters, or URL
                                    encoded spaces, e.g. +
                                </li>
                                <li><strong>case_set_id</strong>= [case set ID] (optional). If not provided, all cases
                                    that have data in the specified mutation profiles will be queried.
                                </li>
                                <li><strong>gene_list</strong>= [one or more genes, specified as HUGO Gene Symbols or
                                    Entrez Gene IDs] (required). Multiple genes must be separated by comma (,)
                                    characters, or URL encoded spaces, e.g. +
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>A tab-delimited file with the following columns:</p>
                            <ul>
                                <li><strong>entrez_gene_id</strong>: Entrez Gene ID.</li>
                                <li><strong>gene_symbol</strong>: HUGO Gene Symbol.</li>
                                <li><strong>case_id</strong>: Case ID.</li>
                                <li><strong>sequencing_center</strong>: Sequencer Center responsible for identifying
                                    this mutation. For example: broad.mit.edu.
                                </li>
                                <li><strong>mutation_status</strong>: somatic or germline mutation status. all mutations
                                    returned will be of type somatic.
                                </li>
                                <li><strong>mutation_type</strong>: mutation type, such as nonsense, missense, or
                                    frameshift_ins.
                                </li>
                                <li><strong>validation_status</strong>: validation status. Usually valid, invalid, or
                                    unknown.
                                </li>
                                <li><strong>amino_acid_change</strong>: amino acid change resulting from the mutation.
                                </li>
                                <li><strong>functional_impact_score</strong>: predicted functional impact score, as
                                    predicted by: <a href="http://mutationassessor.org/">Mutation Assessor</a>.
                                </li>
                                <li><strong>xvar_link</strong>: Link to the Mutation Assessor web site.</li>
                                <li><strong>xvar_link_pdb</strong>: Link to the Protein Data Bank (PDB) View within
                                    Mutation Assessor web site.
                                </li>
                                <li><strong>xvar_link_msa</strong>: Link the Multiple Sequence Alignment (MSA) view
                                    within the Mutation Assessor web site.
                                </li>
                                <li><strong>chr</strong>: chromosome where mutation occurs.</li>
                                <li><strong>start_position</strong>: start position of mutation.</li>
                                <li><strong>end_position</strong>: end position of mutation.</li>
                                <li><strong>genetic_profile_id</strong>: mutation profile id.</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td>
                            <ul>
                                <li><a
                                    href="webservice.do?cmd=getMutationData&amp;case_set_id=gbm_tcga_all&amp;genetic_profile_id=gbm_tcga_mutations&amp;gene_list=EGFR+PTEN">Get
                                    Extended Mutation Data for EGFR and PTEN in TCGA GBM.</a></li>
                                <li><a
                                    href="webservice.do?cmd=getMutationData&amp;genetic_profile_id=ov_tcga_mutations+ucec_tcga_mutations&amp;gene_list=BRCA1">Get
                                    Extended Mutation Data for BRCA1 in TCGA OV and UCEC.</a></li>
                            </ul>
                        </td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">
                    <tbody>
                    <tr>
                        <th colSpan={2}>Get Clinical Data</th>
                    </tr>

                    <tr>
                        <td>Description</td>
                        <td>Retrieves overall survival, disease free survival and age at diagnosis for specified cases.
                            Due to patient privacy restrictions, no other clinical data is available.
                        </td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getClinicalData (required)</li>
                                <li><strong>case_set_id</strong>= [case set ID] (required)</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>A tab-delimited file with the following columns:</p>
                            <ul>
                                <li><strong>case_id</strong>: Unique Case Identifier.</li>
                                <li><strong>overall_survival_months</strong>: Overall survival, in months.</li>
                                <li><strong>overall_survival_status</strong>: Overall survival status, usually indicated
                                    as "LIVING" or "DECEASED".
                                </li>
                                <li><strong>disease_free_survival_months</strong>: Disease free survival, in months.
                                </li>
                                <li><strong>disease_free_survival_status</strong>: Disease free survival status, usually
                                    indicated as "DiseaseFree" or "Recurred/Progressed".
                                </li>
                                <li><strong>age_at_diagnosis</strong>: Age at diagnosis.</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td><a href="webservice.do?cmd=getClinicalData&amp;case_set_id=ov_tcga_all">Get Clinical Data
                            for All TCGA Ovarian Cases.</a></td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">

                    <tbody>
                    <tr>
                        <th colSpan={2}>Get Protein/Phosphoprotein Antibody Information</th>
                    </tr>

                    <tr>
                        <td>Description</td>
                        <td>Retrieves information on antibodies used by reverse-phase protein arrays (RPPA) to measure
                            protein/phosphoprotein levels.
                        </td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getProteinArrayInfo (required)</li>
                                <li><strong>cancer_study_id</strong>= [cancer study ID] (required)</li>
                                <li><strong>protein_array_type</strong>= [protein_level or phosphorylation]</li>
                                <li><strong>gene_list</strong>= [one or more genes, specified as HUGO Gene Symbols or
                                    Entrez Gene IDs]. Multiple genes must be separated by comma (,) characters, or URL
                                    encoded spaces, e.g. +
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format</td>
                        <td><p>You will receive a tab-delimited matrix with the following 4 columns:</p>
                            <ul>
                                <li><strong>ARRAY_ID</strong>: The protein array ID.</li>
                                <li><strong>ARRAY_TYPE</strong>: The protein array antibody type, i.e. protein_level or
                                    phosphorylation.
                                </li>
                                <li><strong>GENE</strong>: The targeted gene name (HUGO gene symbol).</li>
                                <li><strong>RESIDUE</strong>: The targeted resdue(s).</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td>
                            <ul>
                                <li><a href="webservice.do?cmd=getProteinArrayInfo&amp;cancer_study_id=coadread_tcga">Get
                                    Information on RPPA Antibodies Measuring TCGA Colorectal Cases.</a></li>
                                <li><a
                                    href="webservice.do?cmd=getProteinArrayInfo&amp;cancer_study_id=coadread_tcga&amp;protein_array_type=phosphorylation">Get
                                    Information on RPPA Phosphoprotein Antibodies Measuring TCGA Colorectal Cases.</a>
                                </li>
                                <li><a
                                    href="webservice.do?cmd=getProteinArrayInfo&amp;cancer_study_id=coadread_tcga&amp;protein_array_type=protein_level&amp;gene_list=ERBB2+TP53">Get
                                    Information on ERBB2 and TP53 RPPA Protein Antibodies Measuring TCGA Colorectal
                                    Cases.</a></li>
                            </ul>
                        </td>
                    </tr>
                    </tbody>
                </table>

                <table className="table table-bordered">

                    <tbody>
                    <tr>
                        <th colSpan={2}>Get RPPA-based Proteomics Data</th>
                    </tr>

                    <tr>
                        <td>Description</td>
                        <td>Retrieves protein and/or phosphoprotein levels measured by reverse-phase protein arrays
                            (RPPA).
                        </td>
                    </tr>
                    <tr>
                        <td>Query Format</td>
                        <td>
                            <ul>
                                <li><strong>cmd</strong>=getProteinArrayData (required)</li>
                                <li><strong>case_set_id</strong>= [case set ID] (required)</li>
                                <li><strong>array_info</strong>= [1 or 0]. If 1, antibody information will also be
                                    exported.
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format 1</td>
                        <td>
                            <p>If the parameter of array_info is not specified or it is not 1, you will receive a
                                tab-delimited matrix with the following columns:</p>
                            <ul>
                                <li><strong>ARRAY_ID</strong>: The protein array ID.</li>
                                <li><strong>Columns 2 - N</strong>: Data for each case.</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Response Format 2</td>
                        <td>
                            <p>If the parameter of array_info is 1, you will receive a tab-delimited matrix with the
                                following columns:</p>
                            <ul>
                                <li><strong>ARRAY_ID</strong>: The protein array ID.</li>
                                <li><strong>ARRAY_TYPE</strong>: The protein array antibody type, i.e. protein_level or
                                    phosphorylation.
                                </li>
                                <li><strong>GENE</strong>: The targeted gene name (HUGO gene symbol).</li>
                                <li><strong>RESIDUE</strong>: The targeted resdue(s).</li>
                                <li><strong>Columns 5 - N</strong>: Data for each case.</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>Example</td>
                        <td>
                            <ul>
                                <li><a href="webservice.do?cmd=getProteinArrayData&amp;case_set_id=coadread_tcga_RPPA">Get
                                    All RPPA Data in TCGA Colorectal Cases.</a></li>
                                <li><a
                                    href="webservice.do?cmd=getProteinArrayData&amp;case_set_id=coadread_tcga_RPPA&amp;array_info=1">Get
                                    All RPPA Data with antibody information in TCGA Colorectal Cases.</a></li>
                            </ul>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
            <hr />

                <h2 id="linking-to-us">Linking to Us</h2>
                <p>Once you have a cancer_study_id, it is very easy to create stable links from your web site to the
                    cBio Portal. Stable links must point to ln, and can include the following parameters:</p>
                <ul>
                    <li><strong>q</strong>=[a query following <a href="oql" target="_blank">Onco Query Language</a>,
                        e.g. a space separated list of HUGO gene symbols] (required)
                    </li>
                    <li><strong>cancer_study_id</strong>=[cancer study ID] (if not specified, do a cross cancer query)
                    </li>
                    <li><strong>report</strong>=[report to display; can be one of: full (default), oncoprint_html]</li>
                </ul>
                <p>For example, here is a link to the TCGA GBM data for EGFR and NF1:</p>
                <p><a href="ln?cancer_study_id=gbm_tcga&amp;q=EGFR+NF1">ln?cancer_study_id=gbm_tcga&amp;q=EGFR+NF1</a>
                </p>
                <p>And a link to TP53 mutations across all cancer studies:</p>
                <p><a href="ln?q=TP53:MUT">ln?q=TP53:MUT</a></p>
        </PageLayout>;

    }

}
