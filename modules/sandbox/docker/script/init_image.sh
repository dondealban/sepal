#!/bin/bash
set -e

apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -qq -y \
    sssd \
    libpam-sss \
    libnss-sss \
    libnss-ldap \
    gdebi-core \
    mapnik-utils \
    net-tools \
    openssh-server \
    sudo \
    supervisor \
    gettext

# Disable message of the day by commenting out configuration lines refering to pam_motd.so
sed -e '/.*pam_motd\.so.*/ s/^#*/#/' -i /etc/pam.d/sshd
sed -e '/.*pam_motd\.so.*/ s/^#*/#/' -i /etc/pam.d/login
sed -e '/PrintMotd / s/^#*/#/' -i /etc/ssh/sshd_config
sed -e '/PrintLastLog / s/^#*/#/' -i /etc/ssh/sshd_config

# Prevent locale from being forwarded by client
sed -e '/AcceptEnv / s/^#*/#/' -i /etc/ssh/sshd_config

# Get authorized keys from LDAP, disable message of the day and last log printout, disable options for speeding up access
printf '%s\n' \
    'AuthorizedKeysCommand /usr/bin/sss_ssh_authorizedkeys' \
    'AuthorizedKeysCommandUser root' \
    'PrintMotd no' \
    'PrintLastLog no' \
    'UseDNS no' \
    'GSSAPIAuthentication no' \
    >> /etc/ssh/sshd_config

# Update the prompt - use "sepal" instead of the funny looking hostname
printf '%s\n' \
    "PS1='${debian_chroot:+($debian_chroot)}\u@sepal:\w\$ '" \
    >> /etc/bash.bashrc

echo
echo "*********************************"
echo "*** Installing RStudio Server ***"
echo "*********************************"
rstudio=rstudio-server-1.1.456-amd64.deb
wget -nv https://download2.rstudio.org/$rstudio
gdebi -n $rstudio
printf '%s\n' \
    "server-app-armor-enabled=0" \
    >> /etc/rstudio/rserver.conf
rm -f $rstudio

echo
echo "*******************************"
echo "*** Installing Shiny Server ***"
echo "*******************************"
shinyServer=shiny-server-1.5.9.923-amd64.deb
wget -nv https://download3.rstudio.org/ubuntu-14.04/x86_64/$shinyServer
gdebi -n $shinyServer
chown shiny:root /usr/lib/R/library
rm $shinyServer

# Apply patch, allowing reconnect timeout to be configured
git clone https://github.com/openforis/shiny-server.git
cd shiny-server
git checkout fix
cp -r lib/* /opt/shiny-server/lib/
cp -r R/* /opt/shiny-server/R
cp -r config/shiny-server-rules.config /opt/shiny-server/config/
cd ..
rm -rf shiny-server

git clone https://github.com/openforis/shiny-server-client.git
cd shiny-server-client
git checkout reconnect-on-3000
yarn install
npm run prepublish
cp dist/* /opt/shiny-server/node_modules/shiny-server-client/dist/
cd ..
rm -rf shiny-server-client

echo
echo "**************************"
echo "*** Installing Jupyter ***"
echo "**************************"
/usr/local/bin/pip3 install jupyter
jupyter notebook --generate-config
/usr/bin/python2 -m pip install ipykernel
/usr/bin/python2 -m ipykernel install
/usr/bin/python3 -m pip install ipykernel
/usr/bin/python3 -m ipykernel install

R -e "pacman::p_load('IRkernel')"
R -e "IRkernel::installspec()"


/usr/bin/python2 -m pip install ipywidgets
/usr/bin/python3 -m pip install ipywidgets
/usr/local/bin/jupyter nbextension enable --py --sys-prefix widgetsnbextension

git clone https://github.com/ipython-contrib/jupyter_contrib_nbextensions.git
/usr/bin/python2 -m pip install -e jupyter_contrib_nbextensions
/usr/bin/python3 -m pip install -e jupyter_contrib_nbextensions
/usr/local/bin/jupyter contrib nbextension install

/usr/local/bin/jupyter nbextensions_configurator enable

/usr/bin/python2 -m pip install folium
/usr/bin/python3 -m pip install folium
