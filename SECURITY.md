# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Checkpoint K, please report
it privately. **Do not open a public GitHub issue.**

Email: **simontodd.design@gmail.com**

Please include:
- A description of the vulnerability
- Steps to reproduce
- Affected component (CK Core, CK Manager, CK Launcher, mod, agent)
- Your suggested fix (if any)

I aim to respond within 72 hours and to ship a fix within 14 days for
high-severity issues.

## Supported Versions

Only the latest release of each component is supported. Older versions
do not receive security patches.

## Out of scope

- Vulnerabilities in third-party dependencies (please report upstream)
- Issues requiring physical access to a host
- Social engineering of admin accounts
- DoS via simply joining a server and disconnecting repeatedly (BattlEye
  + rate limits handle this; not a CK issue)
