import type { Env } from '../types/context';
export declare class EmailService {
    private env;
    constructor(env: Env);
    sendMagicLinkEmail(email: string, token: string): Promise<void>;
    private sendViaResend;
    private getLoginUrl;
    private getHtmlContent;
    private getTextContent;
}
//# sourceMappingURL=email.d.ts.map