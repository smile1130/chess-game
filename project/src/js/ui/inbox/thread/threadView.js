import * as h from '../../helper';
import { header as headerWidget, backButton, userStatus } from '../../shared/common';
import layout from '../../layout';
import i18n from '../../../i18n';

export default function view(vnode) {
  const ctrl = vnode.state;
  const headerCtrl = () => headerWidget(null,
    backButton(ctrl.thread() ? ctrl.thread().name : null)
  );
  const bodyCtrl = threadBody.bind(undefined, ctrl);

  return layout.free(headerCtrl, bodyCtrl);
}

function threadBody(ctrl) {
  if (!ctrl.thread()) return null;
  console.log(ctrl.thread());
  return (
    <div key={ctrl.thread().id} className="threadWrapper native_scroller">
      {ctrl.thread().posts.map(renderPost)}
      <div className="responseWrapper">
        <form id="responseForm"
        onsubmit={function(e) {
          e.preventDefault();
          return ctrl.send(e.target);
        }}>
          <input id="id" value={ctrl.id()} type="hidden" />
          <textarea id="body" className="responseBody" />
          <button key="send" className="fatButton responseSend" oncreate={h.autofocus} type="submit">
            <span className="fa fa-check" />
            {i18n('send')}
          </button>
        </form>
      </div>
    </div>
  );
}

function renderPost(post, index, posts) {
  let postId = 'postWrapper';
  if (index === 0)
    postId += ' first';
  if (index === posts.length-1)
    postId += ' last';
  return (
    <div className={postId} key={post.createdAd}>
      <span className="infos">
        {userStatus(post.sender)}
        <span className="arrow" data-icon="H"></span>
        {userStatus(post.receiver)}
        &nbsp;–&nbsp;
        {postDateFormat(post.createdAt)}
      </span>
      <div className="text">{post.text}</div>
    </div>
  );
}

function postDateFormat (timeInMillis) {
  const time = window.moment(timeInMillis);
  return time.format('MMM D H:mm');
}
