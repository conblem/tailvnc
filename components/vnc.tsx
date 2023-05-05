import {createIPN} from "tsconnect/pkg";
import {useEffect, useRef, useState} from "react";
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

interface WaitingForLogin {
    state: "waitingForLogin";
    url: string
}

interface Error {
    state: "error";
    error: string;
}

type State = Starting | WaitingForLogin | RunningState | Error;

let didIPNInit = false;

function useIPN(): State {
    const [state, setState] = useState<State>({state: "starting"});
    const [ipnState, setIpnState] = useState<IPNState | null>(null);
    const [ipn, setIpn] = useState<IPN | null>(null);

    useEffect(() => {
        if(didIPNInit) return;

        didIPNInit = true;
        (async () => {
            // @ts-ignore
            const emptyAuthKey: string = undefined as string;
            const ipn = await createIPN({
                stateStorage: localStorage,
                routeAll: true,
                authKey: emptyAuthKey,
                panicHandler: (error: string) => setState({ state: "error", error }),
            });
            ipn.run({
                notifyNetMap: (netMap: string) => console.log("netmap", netMap),
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

export function VNC() {
    const ipnState = useIPN();
    const div = useRef(null);
    useEffect(() => {
        if(ipnState.state !== "running") {
            console.log(ipnState);
            return;
        }
        (async () => {
            let wrapper = await WebSocketWrapper.connect(ipnState.ipn);
            Log.initLogging('debug');
            const rfb = new RFB(div.current, wrapper, { credentials: { password: "Wo(Z74(.QF5jZHhtH<s,"}});
            rfb.scaleViewport = true;
        })();
    }, [ipnState])
    return <div className={styles.vnc} ref={div}></div>
}

class WebSocketWrapper {
    static async connect(ipn: IPN): Promise<WebSocketWrapper> {
        let onmessage = (data: Uint8Array) => {};

        // we connect first
        const tcp = await ipn.tcp("100.72.98.51", 5900, (data: Uint8Array) => onmessage(data));

        const wrapper = new WebSocketWrapper(tcp);
        // then reassign the onmessage handler
        // this is okay because vnc is a client speak first protocol
        onmessage = (data: Uint8Array) => wrapper.onmessage({ data });

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
