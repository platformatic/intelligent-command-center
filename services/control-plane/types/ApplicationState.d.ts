/**
 * ApplicationState
 * A ApplicationState
 */
declare interface ApplicationState {
    id?: string;
    applicationId: string;
    createdAt?: string | null;
    pltVersion: string;
    state: {
        [name: string]: any;
    };
}
export { ApplicationState };
