import { join } from "path";
import { EmailProof } from "./emailProof";
import { readFileSync, existsSync, mkdirSync, rm, writeFileSync } from "fs";

async function main() {
    // get parent directory on windows and linux
    const _parentDir = join(__dirname, "..");
    const _file_wasm = join(_parentDir, "zkpFiles", "EmailApprover.wasm");
    const _file_zkey = join(_parentDir, "zkpFiles", "emailapprover_final.zkey");
    const _file_vkey = join(_parentDir, "zkpFiles", "verification_key.json");

    // to check hanging
    // setInterval(() => {
    //     console.log(new Date().toLocaleString());
    // }, 1000);

    //#region EmailAddrCommit test
    {
        /*
                    input 1: 12322
                    input 2: xurigong@gmail.com
                    output: 21770830330223450464430503989801104958781861536559456253001293349309810700942
                */
        const emailAddr = "xurigong@gmail.com";
        const commitment_rand = BigInt(12322);
        const addressCommit = EmailProof.emailAddrCommit(
            emailAddr,
            commitment_rand
        ); // static method
        if (
            addressCommit !==
            BigInt(
                "21770830330223450464430503989801104958781861536559456253001293349309810700942"
            )
        ) {
            throw new Error("EmailAddrCommit test failed");
        }
        const emailDomainHash = EmailProof.emailDomainHash("gmail.com");
        if (
            emailDomainHash !==
            BigInt(
                "19361475216702037345099198859178566376129780752330640287510661993072372998404"
            )
        ) {
            throw new Error("email domain test failed");
        }
        let rawEmail: string;
        rawEmail = readFileSync(join(_parentDir, "emls", "example2.eml"), "utf8");

        const dkimPublicKey = await EmailProof.dkimPublicKeyHash(rawEmail);
        console.log("dkimPublicKey:", dkimPublicKey);
    }
    //#endregion

    const ParallelCount = 1;
    let rapidsnarkProverBin: string | undefined = undefined;
    // download from https://github.com/iden3/rapidsnark/releases/
    console.log("PROVER_PATH:", process.env.PROVER_PATH);
    rapidsnarkProverBin =
        process.env.PROVER_PATH ||
        "/usr/local/rapidsnark-macOS-arm64-v0.0.2/bin/prover";

    const emailProof = new EmailProof(
        _file_wasm,
        _file_zkey,
        _file_vkey,
        rapidsnarkProverBin
    );
    const emailProofTest = async () => {
        const ts1 = Date.now();
        const commitment_rand = BigInt(12322);
        const proof = await emailProof.proveFromEml(
            join(_parentDir, "emls", "example2.eml"),
            commitment_rand
        );
        if (proof === null) {
            throw new Error("EmailProof test failed");
        }
        console.log(proof);
        console.log(
            "generate proof time:",
            Date.now() -
            ts1 +
            "ms. via " +
            (rapidsnarkProverBin === undefined ? "snarkjs" : "rapidsnark")
        );
    };

    const arr = [];
    for (let index = 0; index < ParallelCount; index++) {
        arr.push(emailProofTest());
    }
    console.log("start parallel test: " + ParallelCount + " times");
    const ts1 = Date.now();
    await Promise.all(arr);
    console.log(
        "total time:",
        Date.now() -
        ts1 +
        "ms. via " +
        (rapidsnarkProverBin === undefined ? "snarkjs" : "rapidsnark")
    );
    process.exit(0);
}

main();
