import {createIPN} from "tsconnect";
import {useCallback, useEffect, useRef, useState} from "react";
// @ts-ignore
import * as Log from "@novnc/novnc/core/util/logging";
// @ts-ignore
import RFB from "@novnc/novnc/core/rfb";
import styles from '@/styles/VNC.module.css'

export const localStorage: IPNStateStorage = {
    setState(id, value) {
        window.localStorage.setItem(`ipn-state-${id}`, value)
    },
    getState(id) {
        return window.localStorage.getItem(`ipn-state-${id}`) || ""
    },
}

interface Starting {
    state: "starting";
}

interface RunningState {
    state: "running";
    ipn: IPN
}

interface RunningWithNetMap {
    state: "runningWithNetMap";
    ipn: IPN;
    netMap: string;
}

interface WaitingForLogin {
    state: "waitingForLogin";
    url: string
}

interface Error {
    state: "error";
    error: string;
}

type State = Starting | WaitingForLogin | RunningState | RunningWithNetMap | Error;

let didIPNInit = false;

function useIPN(): State {
    const [state, setState] = useState<State>({state: "starting"});
    const [ipnState, setIpnState] = useState<IPNState>();
    const [ipn, setIpn] = useState<IPN>();

    useEffect(() => {
        if(didIPNInit) return;

        didIPNInit = true;
        (async () => {

            // authKey should probably be optional
            // @ts-ignore
            const emptyAuthKey: string = undefined as string;
            const ipn = await createIPN({
                stateStorage: localStorage,
                routeAll: true,
                authKey: emptyAuthKey,
                panicHandler: (error: string) => setState({ state: "error", error }),
            });
            ipn.run({
                notifyNetMap: (netMap: string) => {
                    if(state.state !== "running") {
                        console.log("invalid state to set netmap oder")
                        return;
                    };
                    setState({ state: "runningWithNetMap", ipn: state.ipn, netMap });
                },
                notifyPanicRecover: (error: string) => setState({ state: "error", error }),
                notifyState: (ipnState: IPNState) => {
                    setIpnState(ipnState)
                    if(state.state !== "running" && ipnState === "Running") {
                        setState({ state: "running", ipn });
                    }
                },
                notifyBrowseToURL: (url: string) => {
                    if(ipnState === "Running") return;
                    setState({ state: "waitingForLogin", url });
                },
            });

            setIpn(ipn);
        })();

    });

    useEffect(() => {
        if (ipnState === "NeedsLogin") {
            ipn?.login();
        }
    }, [ipnState, ipn]);

    return state;
}
const DEFAULT_VNC_PORT = 5900;

function useRFB(host: string, port: number, password: string, ipn?: IPN, div?: HTMLDivElement) {
    useEffect(() => {
        if(ipn === undefined || div === undefined) {
            return
        }

        let rawChannel: TailscaleRawChannel | undefined;
        let rfb: RFB | undefined;
        (async () => {
            rawChannel = await TailscaleRawChannel.connect(ipn, host, port || DEFAULT_VNC_PORT);
            Log.initLogging('debug');
            rfb = new RFB(div, rawChannel, { credentials: { password }});
            rfb.scaleViewport = true;
        })();
        
        return () => {
            if(rfb != undefined) {
                rfb.disconnect();
                return;
            }
            rawChannel?.close();
        }
    }, [host, port, password, ipn, div])
}

export function VNC({host, port, password}: {host: string, port?: number, password: string}) {
    const ipnState = useIPN();
    const [ipn, setIPN] = useState<IPN>();

    const [div, setDiv] = useState<HTMLDivElement>();
    const ref = useCallback((node: HTMLDivElement) => setDiv(node), []);

    // only update ipn if it changes
    useEffect(() => {
        if(ipnState.state === "waitingForLogin") {
            console.log("login", ipnState.url)
            window.open(ipnState.url, '_blank')?.focus();
            return
        }
        if(!(ipnState.state == "running" || ipnState.state == "runningWithNetMap")) {
            console.log(ipnState);
            return;
        }
        if(ipnState.ipn === ipn) {
            return
        }
        setIPN(ipnState.ipn);
    }, [ipnState, ipn]);

    useRFB(host, port || DEFAULT_VNC_PORT, password, ipn, div)

    return <div className={styles.vnc} ref={ref}></div>
}

class TailscaleRawChannel {
    static async connect(ipn: IPN, hostname: string, port: number): Promise<TailscaleRawChannel> {
        let readCallback = (_: Uint8Array) => {};

        // we connect first
        const tcp = await ipn.tcp({
            hostname,
            port,
            readCallback: data => readCallback(data),
            readBufferSizeInBytes: 4 * 1024 * 1024,
        });

        const wrapper = new TailscaleRawChannel(tcp);
        // then reassign the onmessage handler
        // this is okay because vnc is a client first protocol
        readCallback = (data: Uint8Array) => wrapper.onmessage({ data });

        return wrapper;
    }

    onopen: () => void = () => {};
    onclose: (e: CloseEvent) => void = () => {};
    onerror: (e: Event) => void = () => {};
    onmessage: (e: { data: ArrayBuffer}) => void = () => {};
    binaryType: "arraybuffer" = "arraybuffer";
    protocol: "wss" = "wss";
    readyState: "open" = "open";

    private constructor(private readonly tcp: IPNTCPSession) {
    }

    send(data: Uint8Array) {
        this.tcp.write(data);
    }

    close() {
        this.tcp.close();
    }
}
